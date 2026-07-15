import { Plus, Pencil, Trash2, ExternalLink, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminSponsors, SponsorTier } from "@/hooks/useAdminSponsors";

const TIERS: { value: SponsorTier; label: string }[] = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "partner", label: "Partner" },
];

const AdminSponsors = () => {
  const s = useAdminSponsors();
  const editing = s.editing;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-5 sm:py-10">
      <AdminPageHeader
        title="Sponsor"
        description="Gestisci gli sponsor e i partner mostrati nel sito e associabili agli eventi."
        actions={
          <Button onClick={s.openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo sponsor
          </Button>
        }
      />

      {s.loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : s.sponsors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nessuno sponsor configurato.</p>
            <Button onClick={s.openCreate}>
              <Plus className="h-4 w-4 mr-2" />Aggiungi il primo sponsor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {s.sponsors.map((sp) => (
            <Card key={sp.id}>
              <CardContent className="flex items-start gap-3 p-4 sm:gap-4">
                <div className="h-12 w-12 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden sm:h-14 sm:w-14">
                  {sp.logo_url ? (
                    <img src={sp.logo_url} alt={sp.name} className="h-full w-full object-contain" />
                  ) : (
                    <Handshake className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{sp.name}</h3>
                    <Badge variant="secondary" className="capitalize">{sp.tier}</Badge>
                    {!sp.is_active && <Badge variant="outline">Nascosto</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">/{sp.slug}</p>
                  {sp.website_url && (
                    <a
                      href={sp.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 mt-1"
                    >
                      Sito <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={sp.is_active} onCheckedChange={() => s.toggleActive(sp)} />
                      <span className="text-xs text-muted-foreground">Attivo</span>
                    </div>
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => s.openEdit(sp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => s.setDeleteId(sp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={s.editOpen} onOpenChange={s.setEditOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifica sponsor" : "Nuovo sponsor"}</DialogTitle>
            <DialogDescription>
              Compila i dati dello sponsor. Solo gli sponsor attivi sono visibili pubblicamente.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sp-name">Nome *</Label>
                <Input
                  id="sp-name"
                  value={editing.name}
                  onChange={(e) => s.setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-slug">Slug</Label>
                <Input
                  id="sp-slug"
                  placeholder="auto-generato dal nome"
                  value={editing.slug}
                  onChange={(e) => s.setEditing({ ...editing, slug: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-desc">Descrizione</Label>
                <Textarea
                  id="sp-desc"
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => s.setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sp-logo">Logo URL</Label>
                  <Input
                    id="sp-logo"
                    placeholder="https://…"
                    value={editing.logo_url ?? ""}
                    onChange={(e) => s.setEditing({ ...editing, logo_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-web">Sito web</Label>
                  <Input
                    id="sp-web"
                    placeholder="https://…"
                    value={editing.website_url ?? ""}
                    onChange={(e) => s.setEditing({ ...editing, website_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Livello</Label>
                  <Select
                    value={editing.tier}
                    onValueChange={(v) => s.setEditing({ ...editing, tier: v as SponsorTier })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-order">Ordine</Label>
                  <Input
                    id="sp-order"
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => s.setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Attivo</p>
                  <p className="text-xs text-muted-foreground">Se disattivato non compare nel sito.</p>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => s.setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => s.setEditOpen(false)}>Annulla</Button>
            <Button className="w-full sm:w-auto" onClick={s.save} disabled={s.saving}>
              {s.saving ? "Salvo…" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!s.deleteId} onOpenChange={(o) => !o && s.setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare lo sponsor?</AlertDialogTitle>
            <AlertDialogDescription>
              L'azione è irreversibile. Lo sponsor verrà rimosso anche dagli eventi in cui è associato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
            <AlertDialogAction className="w-full sm:w-auto" onClick={s.remove}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSponsors;
