import { useState, useEffect, useMemo } from "react";
import { databases, storage, isAppwriteConfigured } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { EventRow } from "@/interfaces/events";
import { useToast } from "@/hooks/use-toast";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const EVENTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_EVENTS || '';
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_EVENTS || '';

export const emptyEvent = (): Partial<EventRow> => ({
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_public: true,
  has_shuttle: false,
  price_one_way: 0,
  price_round_trip: 0,
  cover_image_url: "",
});

export const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export const useAdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const fetchEvents = async () => {
    if (!isAppwriteConfigured || !DB_ID) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await databases.listDocuments(DB_ID, EVENTS_ID, [Query.orderDesc("starts_at")]);
      const mappedEvents = res.documents.map(d => ({ ...d, id: d.$id, created_at: d.$createdAt })) as any as EventRow[];
      setEvents(mappedEvents);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      total: events.length,
      upcoming: events.filter(e => e.starts_at && new Date(e.starts_at).getTime() >= now).length,
      active: events.filter(e => e.is_active).length,
    };
  }, [events]);

  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "File non valido", description: "Carica un'immagine.", variant: "destructive" }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Massimo 5 MB.", variant: "destructive" }); return;
    }
    
    if (!isAppwriteConfigured || !BUCKET_ID) {
      toast({ title: "Errore", description: "Storage non configurato.", variant: "destructive" }); return;
    }

    setUploadingCover(true);
    try {
      const res = await storage.createFile(BUCKET_ID, ID.unique(), file);
      const url = storage.getFileView(BUCKET_ID, res.$id);
      setEditing((prev) => prev ? { ...prev, cover_image_url: url.toString() } : prev);
      toast({ title: "Immagine caricata" });
    } catch (err: any) {
      toast({ title: "Upload fallito", description: err.message, variant: "destructive" });
    }
    setUploadingCover(false);
  };

  const openCreate = () => { setEditing(emptyEvent()); setEditOpen(true); };
  const openEdit = (e: EventRow) => { setEditing({ ...e, starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at) }); setEditOpen(true); };

  const saveEvent = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Titolo obbligatorio", variant: "destructive" }); return; }
    
    const slugify = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "evento";
    
    const payload: Record<string, any> = {
      title: editing.title.trim(),
      slug: slugify(editing.title.trim()) + "-" + Math.random().toString(36).slice(2, 7),
      description: editing.description?.trim() || null,
      location: editing.location?.trim() || null,
      starts_at: fromLocalInput((editing.starts_at as string) || ""),
      ends_at: fromLocalInput((editing.ends_at as string) || ""),
      is_active: !!editing.is_active,
      is_public: !!editing.is_public,
      has_shuttle: !!editing.has_shuttle,
      price_one_way: Number(editing.price_one_way) || 0,
      price_round_trip: Number(editing.price_round_trip) || 0,
      cover_image_url: editing.cover_image_url?.trim() || null,
    };

    if (!isAppwriteConfigured || !DB_ID) return;

    try {
      if (editing.id) {
        const { slug, ...updatePayload } = payload;
        await databases.updateDocument(DB_ID, EVENTS_ID, editing.id, updatePayload);
        toast({ title: "Evento aggiornato" });
      } else {
        await databases.createDocument(DB_ID, EVENTS_ID, ID.unique(), payload);
        toast({ title: "Evento creato" });
      }
      setEditOpen(false);
      setEditing(null);
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const removeEvent = async () => {
    if (!deleteId || !isAppwriteConfigured || !DB_ID) return;
    try {
      await databases.deleteDocument(DB_ID, EVENTS_ID, deleteId);
      toast({ title: "Evento eliminato" });
      setEvents(prev => prev.filter(e => e.id !== deleteId));
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const toggleField = async (e: EventRow, field: "is_active" | "is_public") => {
    const next = !e[field];
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, [field]: next } : x));
    
    if (isAppwriteConfigured && DB_ID) {
      try {
        await databases.updateDocument(DB_ID, EVENTS_ID, e.id, { [field]: next });
      } catch (err: any) {
        toast({ title: "Errore", description: err.message, variant: "destructive" });
        setEvents(prev => prev.map(x => x.id === e.id ? { ...x, [field]: !next } : x));
      }
    }
  };

  return {
    events, loading, counts,
    editOpen, setEditOpen, editing, setEditing, openCreate, openEdit, saveEvent,
    deleteId, setDeleteId, removeEvent,
    uploadingCover, handleCoverUpload, toggleField
  };
};
