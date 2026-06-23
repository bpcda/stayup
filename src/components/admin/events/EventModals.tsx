import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bus, Trash2, X } from "lucide-react";
import { EventRow, EventCategoryRow, SponsorRow, EventStatus } from "@/interfaces/events";
import { slugify } from "@/hooks/useAdminEvents";

interface EventModalsProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editing: Partial<EventRow> | null;
  setEditing: (e: Partial<EventRow> | null) => void;
  saveEvent: () => void;
  uploadingCover: boolean;
  handleCoverUpload: (file: File) => void;
  uploadingGallery: boolean;
  handleGalleryUpload: (files: FileList | File[]) => void;
  removeGalleryImage: (url: string) => void;
  toggleSponsor: (id: string) => void;
  categories: EventCategoryRow[];
  sponsors: SponsorRow[];
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  removeEvent: () => void;
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Bozza" },
  { value: "published", label: "Pubblicato" },
  { value: "cancelled", label: "Annullato" },
  { value: "ended", label: "Concluso" },
];

export const EventModals = (props: EventModalsProps) => {
  const e = props.editing;
  const set = (patch: Partial<EventRow>) => props.setEditing(e ? { ...e, ...patch } : e);
  const selectedSponsorIds = e?.sponsor_ids ?? [];

  return (
    <>
      <Dialog open={props.editOpen} onOpenChange={props.setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{e?.id ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
            <DialogDescription>Compila i dettagli dell'evento.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="info">Informazioni</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="sponsor">Sponsor</TabsTrigger>
              <TabsTrigger value="opzioni">Opzioni</TabsTrigger>
            </TabsList>

            {/* INFO */}
            <TabsContent value="info" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input id="title" value={e?.title ?? ""} onChange={(ev) => set({ title: ev.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={e?.slug ?? ""}
                    placeholder={e?.title ? slugify(e.title) : "auto-generato"}
                    onChange={(ev) => set({ slug: ev.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={e?.category_id ?? "none"}
                    onValueChange={(v) => set({ category_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger id="category"><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nessuna —</SelectItem>
                      {props.categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Stato</Label>
                  <Select value={e?.status ?? "draft"} onValueChange={(v) => set({ status: v as EventStatus })}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capienza</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={0}
                    value={e?.capacity ?? ""}
                    onChange={(ev) => set({ capacity: ev.target.value === "" ? null : Number(ev.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Descrizione breve</Label>
                <Textarea
                  id="short_description"
                  rows={2}
                  maxLength={280}
                  value={e?.short_description ?? ""}
                  onChange={(ev) => set({ short_description: ev.target.value })}
                />
                <p className="text-xs text-muted-foreground">Max 280 caratteri, usata negli elenchi.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione completa</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={e?.description ?? ""}
                  onChange={(ev) => set({ description: ev.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Inizio *</Label>
                  <Input id="starts_at" type="datetime-local" value={(e?.starts_at as string) ?? ""} onChange={(ev) => set({ starts_at: ev.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">Fine</Label>
                  <Input id="ends_at" type="datetime-local" value={(e?.ends_at as string) ?? ""} onChange={(ev) => set({ ends_at: ev.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="location">Località</Label>
                  <Input id="location" value={e?.location ?? ""} onChange={(ev) => set({ location: ev.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" value={e?.venue ?? ""} onChange={(ev) => set({ venue: ev.target.value })} />
                </div>
              </div>
            </TabsContent>

            {/* MEDIA */}
            <TabsContent value="media" className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cover_image_file">Banner / Copertina</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="cover_image_file"
                    type="file"
                    accept="image/*"
                    disabled={props.uploadingCover}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (f) props.handleCoverUpload(f);
                      ev.target.value = "";
                    }}
                  />
                  {e?.cover_image_url && (
                    <Button type="button" variant="outline" size="sm" onClick={() => set({ cover_image_url: "" })}>
                      Rimuovi
                    </Button>
                  )}
                </div>
                {props.uploadingCover && <p className="text-xs text-muted-foreground">Caricamento in corso…</p>}
                {e?.cover_image_url && (
                  <img src={e.cover_image_url} alt="Anteprima" className="mt-2 w-full max-h-56 object-cover rounded-md border border-border" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gallery_files">Gallery</Label>
                <Input
                  id="gallery_files"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={props.uploadingGallery}
                  onChange={(ev) => {
                    if (ev.target.files?.length) props.handleGalleryUpload(ev.target.files);
                    ev.target.value = "";
                  }}
                />
                {props.uploadingGallery && <p className="text-xs text-muted-foreground">Caricamento gallery…</p>}
                {(e?.gallery_urls?.length ?? 0) > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {(e?.gallery_urls ?? []).map((url) => (
                      <div key={url} className="relative group rounded-md overflow-hidden border border-border">
                        <img src={url} alt="" className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => props.removeGalleryImage(url)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition"
                          aria-label="Rimuovi"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* SPONSOR */}
            <TabsContent value="sponsor" className="space-y-3 pt-4">
              {props.sponsors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuno sponsor disponibile. Aggiungili nella tabella sponsors.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {props.sponsors.map((s) => {
                    const active = selectedSponsorIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => props.toggleSponsor(s.id)}
                        className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      >
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="w-10 h-10 object-contain rounded bg-background" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.name}</p>
                          {s.tier && <Badge variant="outline" className="text-[10px] mt-0.5">{s.tier}</Badge>}
                        </div>
                        <div className={`w-4 h-4 rounded-sm border ${active ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* OPZIONI */}
            <TabsContent value="opzioni" className="space-y-3 pt-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Bus className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Servizio Navetta</p>
                    <p className="text-xs text-muted-foreground">Abilita la prenotazione delle navette.</p>
                  </div>
                </div>
                <Switch checked={!!e?.has_shuttle} onCheckedChange={(v) => set({ has_shuttle: v })} />
              </div>

              {e?.has_shuttle && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-muted/30">
                  <div className="space-y-1.5">
                    <Label htmlFor="price_one_way" className="text-xs">Prezzo Sola Andata (€)</Label>
                    <Input id="price_one_way" type="number" step="0.5" value={e?.price_one_way ?? 0} onChange={(ev) => set({ price_one_way: Number(ev.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price_round_trip" className="text-xs">Prezzo A/R (€)</Label>
                    <Input id="price_round_trip" type="number" step="0.5" value={e?.price_round_trip ?? 0} onChange={(ev) => set({ price_round_trip: Number(ev.target.value) })} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border p-3">
                <div><p className="font-medium text-sm">Attivo (legacy)</p><p className="text-xs text-muted-foreground">Se disattivato non è visibile lato sito.</p></div>
                <Switch checked={!!e?.is_active} onCheckedChange={(v) => set({ is_active: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><p className="font-medium text-sm">Pubblico</p><p className="text-xs text-muted-foreground">Visibile a tutti, anche non iscritti.</p></div>
                <Switch checked={!!e?.is_public} onCheckedChange={(v) => set({ is_public: v })} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
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
            <AlertDialogAction onClick={props.removeEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
