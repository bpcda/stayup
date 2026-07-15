import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface EventModalsProps {
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  removeEvent: () => void;
}

export const EventModals = (props: EventModalsProps) => (
  <AlertDialog open={!!props.deleteId} onOpenChange={(o) => !o && props.setDeleteId(null)}>
    <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-lg">
      <AlertDialogHeader>
        <AlertDialogTitle>Eliminare l'evento?</AlertDialogTitle>
        <AlertDialogDescription>
          L'azione è irreversibile. Verranno rimosse anche tutte le iscrizioni collegate.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
        <AlertDialogAction
          onClick={props.removeEvent}
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
        >
          <Trash2 className="h-4 w-4 mr-2" />Elimina
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
