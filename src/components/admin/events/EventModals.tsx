import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bus } from "lucide-react";
import { EventRow } from "@/interfaces/events";

interface EventModalsProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editing: Partial<EventRow> | null;
  setEditing: (e: any) => void;
  saveEvent: () => void;
  uploadingCover: boolean;
  handleCoverUpload: (file: File) => void;
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  removeEvent: () => void;
}

export const EventModals = (props: EventModalsProps) => {
  return (
    <>
      <Dialog open={props.editOpen} onOpenChange={props.setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{props.editing?.id ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
            <DialogDescription>Compila i dettagli dell'evento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input id="title" value={props.editing?.title ?? ""} onChange={(e) => props.setEditing({ ...props.editing!, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea id="description" rows={4} value={props.editing?.description ?? ""} onChange={(e) => props.setEditing({ ...props.editing!, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Luogo</Label>
              <Input id="location" value={props.editing?.location ?? ""} onChange={(e) => props.setEditing({ ...props.editing!, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover_image_file">Immagine di copertina</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="cover_image_file"
                  type="file"
                  accept="image/*"
                  disabled={props.uploadingCover}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) props.handleCoverUpload(f);
                    e.target.value = "";
                  }}
                />
                {props.editing?.cover_image_url && (
                  <Button type="button" variant="outline" size="sm" onClick={() => props.setEditing({ ...props.editing!, cover_image_url: "" })}>
                    Rimuovi
                  </Button>
                )}
              </div>
              {props.uploadingCover && <p className="text-xs text-muted-foreground">Caricamento in corso…</p>}
              {props.editing?.cover_image_url && (
                <img src={props.editing.cover_image_url} alt="Anteprima" className="mt-2 w-full max-h-48 object-cover rounded-md border border-border" />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Inizio</Label>
                <Input id="starts_at" type="datetime-local" value={props.editing?.starts_at ?? ""} onChange={(e) => props.setEditing({ ...props.editing!, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">Fine</Label>
                <Input id="ends_at" type="datetime-local" value={props.editing?.ends_at ?? ""} onChange={(e) => props.setEditing({ ...props.editing!, ends_at: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Bus className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Servizio Navetta</p>
                  <p className="text-xs text-muted-foreground">Abilita la prenotazione delle navette per questo evento.</p>
                </div>
              </div>
              <Switch checked={!!props.editing?.has_shuttle} onCheckedChange={(v) => props.setEditing({ ...props.editing!, has_shuttle: v })} />
            </div>

            {props.editing?.has_shuttle && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="price_one_way" className="text-xs">Prezzo Sola Andata (€)</Label>
                  <Input 
                    id="price_one_way" 
                    type="number" 
                    step="0.5"
                    value={props.editing?.price_one_way ?? 0} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const isInitial = props.editing?.price_one_way === props.editing?.price_round_trip;
                      props.setEditing({ 
                        ...props.editing!, 
                        price_one_way: val,
                        price_round_trip: isInitial ? val : props.editing?.price_round_trip 
                      });
                    }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price_round_trip" className="text-xs">Prezzo A/R (€)</Label>
                  <Input 
                    id="price_round_trip" 
                    type="number" 
                    step="0.5"
                    value={props.editing?.price_round_trip ?? 0} 
                    onChange={(e) => props.setEditing({ ...props.editing!, price_round_trip: Number(e.target.value) })} 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <div><p className="font-medium text-sm">Attivo</p><p className="text-xs text-muted-foreground">Se disattivato non è visibile lato sito.</p></div>
              <Switch checked={!!props.editing?.is_active} onCheckedChange={(v) => props.setEditing({ ...props.editing!, is_active: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><p className="font-medium text-sm">Pubblico</p><p className="text-xs text-muted-foreground">Visibile a tutti, anche non iscritti.</p></div>
              <Switch checked={!!props.editing?.is_public} onCheckedChange={(v) => props.setEditing({ ...props.editing!, is_public: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setEditOpen(false)}>Annulla</Button>
            <Button onClick={props.saveEvent}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!props.deleteId} onOpenChange={(o) => !o && props.setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'evento?</AlertDialogTitle>
            <AlertDialogDescription>L'azione è irreversibile. Verranno rimosse anche tutte le iscrizioni collegate.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={props.removeEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
