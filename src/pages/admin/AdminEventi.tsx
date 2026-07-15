import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Calendar, MapPin, Eye, EyeOff, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { EventsTable } from "@/components/admin/events/EventsTable";
import { EventModals } from "@/components/admin/events/EventModals";
import type { EventRow, EventStatus } from "@/interfaces/events";

const STATUS_META: Record<EventStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Bozza", variant: "secondary" },
  published: { label: "Pubblicato", variant: "default" },
  cancelled: { label: "Annullato", variant: "destructive" },
  ended: { label: "Concluso", variant: "outline" },
  archived: { label: "Archiviato", variant: "outline" },
};

const fmtDate = (e: EventRow) =>
  e.starts_at
    ? new Date(e.starts_at).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Data da definire";

const fmtCapacity = (e: EventRow) => {
  const booked = e._booked_count ?? 0;
  return e.capacity == null ? `${booked} iscritti` : `${booked}/${e.capacity} iscritti`;
};

const AdminEventi = () => {
  const admin = useAdminEvents();
  const navigate = useNavigate();

  return (
    <div className="container max-w-6xl mx-auto px-4 py-5 sm:py-10">
      <AdminPageHeader
        title="Eventi"
        description="Crea, modifica e gestisci gli iscritti agli eventi."
        actions={<Button asChild className="w-full sm:w-auto"><Link to="/admin/eventi/nuovo"><Plus className="h-4 w-4 mr-2" />Nuovo evento</Link></Button>}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card><CardHeader className="px-3 pb-1 pt-3 sm:pb-2"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Totale</CardTitle></CardHeader><CardContent className="px-3 pb-3 text-xl font-bold sm:text-2xl">{admin.counts.total}</CardContent></Card>
        <Card><CardHeader className="px-3 pb-1 pt-3 sm:pb-2"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Prossimi</CardTitle></CardHeader><CardContent className="px-3 pb-3 text-xl font-bold sm:text-2xl">{admin.counts.upcoming}</CardContent></Card>
        <Card><CardHeader className="px-3 pb-1 pt-3 sm:pb-2"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Attivi</CardTitle></CardHeader><CardContent className="px-3 pb-3 text-xl font-bold sm:text-2xl">{admin.counts.active}</CardContent></Card>
      </div>

      {admin.loading ? (
        <p className="text-center text-muted-foreground py-12">Caricamento...</p>
      ) : admin.events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nessun evento ancora creato.</p>
            <Button asChild><Link to="/admin/eventi/nuovo"><Plus className="h-4 w-4 mr-2" />Crea il primo evento</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {admin.events.map((e) => {
              const meta = STATUS_META[(e.status ?? "draft") as EventStatus] ?? STATUS_META.draft;
              return (
                <Card key={e.id} className="overflow-hidden">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex gap-3">
                      {e.cover_image_url && (
                        <img src={e.cover_image_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{e.title}</h2>
                          <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{fmtDate(e)}</div>
                          <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{e.location ?? "Luogo da definire"}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{fmtCapacity(e)}</Badge>
                      {!e.is_public && <Badge variant="outline">Privato</Badge>}
                      {!e.is_active && <Badge variant="outline">Nascosto</Badge>}
                      {e.has_shuttle && <Badge variant="outline">Navetta</Badge>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="default" asChild>
                        <Link to={`/admin/eventi/${e.id}/iscritti`}><Users className="mr-2 h-4 w-4" /> Iscritti</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/eventi/${e.id}/modifica`}><Pencil className="mr-2 h-4 w-4" /> Modifica</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => admin.toggleField(e, "is_active")}>
                        {e.is_active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {e.is_active ? "Nascondi" : "Mostra"}
                      </Button>
                      {e.has_shuttle ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/admin/eventi/${e.id}/shuttle`}><Bus className="mr-2 h-4 w-4" /> Navette</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => admin.setDeleteId(e.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Elimina
                        </Button>
                      )}
                    </div>
                    {e.has_shuttle && (
                      <Button size="sm" variant="outline" className="w-full text-destructive" onClick={() => admin.setDeleteId(e.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Elimina evento
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              <EventsTable
                events={admin.events}
                toggleField={admin.toggleField}
                openEdit={(e) => navigate(`/admin/eventi/${e.id}/modifica`)}
                setDeleteId={admin.setDeleteId}
              />
            </CardContent>
          </Card>
        </>
      )}

      <EventModals
        deleteId={admin.deleteId}
        setDeleteId={admin.setDeleteId}
        removeEvent={admin.removeEvent}
      />
    </div>
  );
};

export default AdminEventi;
