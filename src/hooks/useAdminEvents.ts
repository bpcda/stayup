import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { EventRow } from "@/interfaces/events";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "event-images";

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

export const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
export const fromLocalInput = (v: string) =>
  v ? new Date(v).toISOString() : null;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "evento";

export const useAdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const fetchEvents = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      setEvents((data ?? []) as unknown as EventRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
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
    if (!isSupabaseConfigured) {
      toast({ title: "Errore", description: "Storage non configurato.", variant: "destructive" }); return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setEditing((prev) => prev ? { ...prev, cover_image_url: pub.publicUrl } : prev);
      toast({ title: "Immagine caricata" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload fallito", description: message, variant: "destructive" });
    }
    setUploadingCover(false);
  };

  const openCreate = () => { setEditing(emptyEvent()); setEditOpen(true); };
  const openEdit = (e: EventRow) => {
    setEditing({ ...e, starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at) });
    setEditOpen(true);
  };

  const saveEvent = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Titolo obbligatorio", variant: "destructive" }); return; }
    if (!isSupabaseConfigured) return;

    const basePayload: Record<string, unknown> = {
      title: editing.title.trim(),
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

    try {
      if (editing.id) {
        const { error } = await supabase.from("events").update(basePayload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Evento aggiornato" });
      } else {
        const insertPayload = {
          ...basePayload,
          slug: slugify(editing.title.trim()) + "-" + Math.random().toString(36).slice(2, 7),
        };
        const { error } = await supabase.from("events").insert(insertPayload);
        if (error) throw error;
        toast({ title: "Evento creato" });
      }
      setEditOpen(false);
      setEditing(null);
      fetchEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
  };

  const removeEvent = async () => {
    if (!deleteId || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Evento eliminato" });
      setEvents(prev => prev.filter(e => e.id !== deleteId));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const toggleField = async (e: EventRow, field: "is_active" | "is_public") => {
    const next = !e[field];
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, [field]: next } : x));
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("events").update({ [field]: next }).eq("id", e.id);
        if (error) throw error;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast({ title: "Errore", description: message, variant: "destructive" });
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
