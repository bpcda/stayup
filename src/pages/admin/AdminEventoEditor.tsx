import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { EventEditorForm } from "@/components/admin/events/EventEditorForm";
import { useAdminEvents } from "@/hooks/useAdminEvents";

const AdminEventoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const admin = useAdminEvents();
  const isNew = !id;

  useEffect(() => {
    if (admin.loading) return;
    if (isNew) {
      if (!admin.editing) admin.openCreate();
      return;
    }
    const event = admin.events.find((e) => e.id === id);
    if (event && admin.editing?.id !== event.id) admin.openEdit(event);
  }, [admin.loading, admin.events, admin.editing, id, isNew]);

  const save = async () => {
    if (await admin.saveEvent()) navigate("/admin/eventi");
  };

  if (admin.loading || (isNew && !admin.editing)) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-5 sm:py-10">
        <p className="text-center text-muted-foreground py-12">Caricamento...</p>
      </div>
    );
  }

  if (!isNew && !admin.events.some((e) => e.id === id)) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-5 sm:py-10">
        <AdminPageHeader title="Evento non trovato" />
        <Button variant="outline" onClick={() => navigate("/admin/eventi")}>Torna agli eventi</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-5 sm:py-10">
      <AdminPageHeader
        title={isNew ? "Nuovo evento" : "Modifica evento"}
        description="Compila i dettagli dell'evento."
        actions={
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/admin/eventi")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Eventi
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <EventEditorForm
            editing={admin.editing}
            setEditing={admin.setEditing}
            uploadingCover={admin.uploadingCover}
            handleCoverUpload={admin.handleCoverUpload}
            removeCoverImage={admin.removeCoverImage}
            uploadingGallery={admin.uploadingGallery}
            handleGalleryUpload={admin.handleGalleryUpload}
            removeGalleryImage={admin.removeGalleryImage}
            toggleSponsor={admin.toggleSponsor}
            categories={admin.categories}
            sponsors={admin.sponsors}
            editingBookedCount={admin.editingBookedCount}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 -mx-4 mt-4 grid grid-cols-2 gap-2 border-t bg-background/95 px-4 py-3 sm:bottom-0 sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:px-0">
        <Button variant="outline" onClick={() => navigate("/admin/eventi")}>Annulla</Button>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Salva</Button>
      </div>
    </div>
  );
};

export default AdminEventoEditor;
