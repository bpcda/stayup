import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { EventsTable } from "@/components/admin/events/EventsTable";
import { EventModals } from "@/components/admin/events/EventModals";

const AdminEventi = () => {
  const admin = useAdminEvents();

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10">
      <AdminPageHeader
        title="Eventi"
        description="Crea, modifica e gestisci gli iscritti agli eventi."
        actions={<Button onClick={admin.openCreate}><Plus className="h-4 w-4 mr-2" />Nuovo evento</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totale</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{admin.counts.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Prossimi</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{admin.counts.upcoming}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Attivi</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{admin.counts.active}</CardContent></Card>
      </div>

      {admin.loading ? (
        <p className="text-center text-muted-foreground py-12">Caricamento...</p>
      ) : admin.events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nessun evento ancora creato.</p>
            <Button onClick={admin.openCreate}><Plus className="h-4 w-4 mr-2" />Crea il primo evento</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <EventsTable 
              events={admin.events} 
              toggleField={admin.toggleField} 
              openEdit={admin.openEdit} 
              setDeleteId={admin.setDeleteId} 
            />
          </CardContent>
        </Card>
      )}

      <EventModals
        editOpen={admin.editOpen}
        setEditOpen={admin.setEditOpen}
        editing={admin.editing}
        setEditing={admin.setEditing}
        saveEvent={admin.saveEvent}
        uploadingCover={admin.uploadingCover}
        handleCoverUpload={admin.handleCoverUpload}
        uploadingGallery={admin.uploadingGallery}
        handleGalleryUpload={admin.handleGalleryUpload}
        removeGalleryImage={admin.removeGalleryImage}
        toggleSponsor={admin.toggleSponsor}
        categories={admin.categories}
        sponsors={admin.sponsors}
        deleteId={admin.deleteId}
        setDeleteId={admin.setDeleteId}
        removeEvent={admin.removeEvent}
      />
    </div>
  );
};

export default AdminEventi;
