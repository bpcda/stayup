import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { EventRow, EventCategoryRow, SponsorRow, EventStatus } from "@/interfaces/events";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "event-covers";

export const emptyEvent = (): Partial<EventRow> => ({
  title: "",
  slug: "",
  short_description: "",
  description: "",
  location: "",
  venue: "",
  category_id: null,
  capacity: null,
  starts_at: "",
  ends_at: "",
  status: "draft",
  is_active: true,
  is_public: true,
  has_shuttle: false,
  price_one_way: 0,
  price_round_trip: 0,
  cover_image_url: "",
  gallery_urls: [],
  sponsor_ids: [],
  seo_title: "",
  seo_description: "",
  og_image_url: "",
});

export const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
export const fromLocalInput = (v: string) =>
  v ? new Date(v).toISOString() : null;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "evento";

/**
 * Estrae il path interno al bucket da un public URL Supabase Storage.
 * Pattern atteso: .../storage/v1/object/public/<bucket>/<path>
 * Ritorna null se l'URL non appartiene al bucket gestito (es. URL esterno).
 */
const extractStoragePath = (publicUrl: string | null | undefined): string | null => {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(publicUrl.substring(idx + marker.length));
};

const removeFromStorage = async (publicUrl: string | null | undefined) => {
  const path = extractStoragePath(publicUrl);
  if (!path) return;
  // Best-effort: ignoriamo errori (file già rimosso, permessi, ecc.)
  await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
};

// Whitelist estensioni e MIME accettati per le immagini evento.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Costruisce la cartella di destinazione su Storage rispettando le policy:
 *   - evento già esistente  → `{event_id}/{kind}`
 *   - evento ancora draft   → `drafts/{user_id}/{kind}`
 * Le RLS policy del bucket consentono scrittura solo su questi prefissi.
 */
const buildEventFolder = (
  eventId: string | null | undefined,
  userId: string,
  kind: "cover" | "gallery",
) => (eventId ? `${eventId}/${kind}` : `drafts/${userId}/${kind}`);

const uploadToStorage = async (file: File, folder: string) => {
  // Estensione derivata dal MIME (più affidabile del nome file utente) +
  // suffisso random anti-collisione. Niente caratteri provenienti dall'input.
  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

const validateImage = (file: File) => {
  if (!ALLOWED_MIME.has(file.type))
    return "Formato non supportato (jpg, png, webp, avif, gif).";
  if (file.size > 5 * 1024 * 1024) return "Massimo 5 MB per immagine.";
  return null;
};

export const useAdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [categories, setCategories] = useState<EventCategoryRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const fetchEvents = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    try {
      const [evRes, catRes, spRes] = await Promise.all([
        supabase.from("events").select("*").order("starts_at", { ascending: false }),
        supabase.from("event_categories").select("id, slug, name").order("name"),
        supabase.from("sponsors").select("id, name, logo_url, tier, is_active").order("name"),
      ]);
      if (evRes.error) throw evRes.error;
      const rows = (evRes.data ?? []) as unknown as EventRow[];

      // Carica i contatori prenotazioni confermate per evento.
      const ids = rows.map((e) => e.id);
      if (ids.length > 0) {
        const { data: bks } = await supabase
          .from("bookings")
          .select("event_id, status")
          .in("event_id", ids);
        const counts = new Map<string, number>();
        ((bks as { event_id: string; status: string }[] | null) ?? [])
          .filter((b) => b.status === "confirmed" || b.status === "pending")
          .forEach((b) => counts.set(b.event_id, (counts.get(b.event_id) ?? 0) + 1));
        rows.forEach((e) => { e._booked_count = counts.get(e.id) ?? 0; });
      }

      setEvents(rows);
      if (!catRes.error) setCategories((catRes.data ?? []) as EventCategoryRow[]);
      if (!spRes.error) setSponsors((spRes.data ?? []) as SponsorRow[]);
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
      active: events.filter(e => e.status === "published").length,
    };
  }, [events]);

  // Contatore live per l'editor: prende il count dell'evento in modifica.
  const editingBookedCount = useMemo(() => {
    if (!editing?.id) return 0;
    return events.find((e) => e.id === editing.id)?._booked_count ?? 0;
  }, [editing?.id, events]);

  const handleCoverUpload = async (file: File) => {
    const err = validateImage(file);
    if (err) { toast({ title: "File non valido", description: err, variant: "destructive" }); return; }
    if (!isSupabaseConfigured) return;
    setUploadingCover(true);
    try {
      // Se sostituiamo una copertina esistente, cancelliamo la vecchia.
      const previousUrl = editing?.cover_image_url ?? null;
      const url = await uploadToStorage(file, "covers");
      setEditing((prev) => prev ? { ...prev, cover_image_url: url } : prev);
      if (previousUrl) await removeFromStorage(previousUrl);
      toast({ title: "Copertina caricata" });
    } catch (e) {
      toast({ title: "Upload fallito", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
    setUploadingCover(false);
  };

  const removeCoverImage = async () => {
    const url = editing?.cover_image_url ?? null;
    setEditing((prev) => prev ? { ...prev, cover_image_url: "" } : prev);
    await removeFromStorage(url);
  };

  const handleGalleryUpload = async (files: FileList | File[]) => {
    if (!isSupabaseConfigured) return;
    const list = Array.from(files);
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const f of list) {
        const err = validateImage(f);
        if (err) { toast({ title: f.name, description: err, variant: "destructive" }); continue; }
        urls.push(await uploadToStorage(f, "gallery"));
      }
      if (urls.length) {
        setEditing((prev) => prev ? { ...prev, gallery_urls: [...(prev.gallery_urls ?? []), ...urls] } : prev);
        toast({ title: `${urls.length} immagine/i aggiunte` });
      }
    } catch (e) {
      toast({ title: "Upload fallito", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
    setUploadingGallery(false);
  };

  const removeGalleryImage = async (url: string) => {
    setEditing((prev) => prev ? { ...prev, gallery_urls: (prev.gallery_urls ?? []).filter(u => u !== url) } : prev);
    await removeFromStorage(url);
  };

  const toggleSponsor = (id: string) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const cur = prev.sponsor_ids ?? [];
      return { ...prev, sponsor_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    });
  };

  const openCreate = () => { setEditing(emptyEvent()); setEditOpen(true); };
  const openEdit = (e: EventRow) => {
    setEditing({
      ...e,
      starts_at: toLocalInput(e.starts_at),
      ends_at: toLocalInput(e.ends_at),
      gallery_urls: e.gallery_urls ?? [],
      sponsor_ids: e.sponsor_ids ?? [],
    });
    setEditOpen(true);
  };

  const saveEvent = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Titolo obbligatorio", variant: "destructive" }); return; }
    if (!editing.starts_at) { toast({ title: "Data inizio obbligatoria", variant: "destructive" }); return; }
    // Validazione date: ends_at >= starts_at (se entrambe presenti)
    if (editing.ends_at && editing.starts_at && editing.ends_at < editing.starts_at) {
      toast({ title: "La data di fine deve essere successiva all'inizio", variant: "destructive" });
      return;
    }
    if (!isSupabaseConfigured) return;

    // Slug: rispetta il valore manuale; se vuoto, il trigger DB lo genera dal title.
    const manualSlug = editing.slug?.trim() || null;

    const status = (editing.status as EventStatus) || "draft";
    // Set automatico di published_at alla prima transizione su 'published'.
    const previous = editing.id ? events.find((e) => e.id === editing.id) : null;
    const wasPublished = previous?.status === "published";
    const shouldSetPublishedAt =
      status === "published" && !wasPublished && !editing.published_at;

    const basePayload: Record<string, unknown> = {
      title: editing.title.trim(),
      slug: manualSlug ?? slugify(editing.title.trim()),
      short_description: editing.short_description?.trim() || null,
      description: editing.description?.trim() || null,
      location: editing.location?.trim() || null,
      venue: editing.venue?.trim() || null,
      category_id: editing.category_id || null,
      capacity: editing.capacity != null && editing.capacity !== ("" as unknown) ? Number(editing.capacity) : null,
      starts_at: fromLocalInput((editing.starts_at as string) || ""),
      ends_at: fromLocalInput((editing.ends_at as string) || ""),
      status,
      is_active: !!editing.is_active,
      is_public: !!editing.is_public,
      has_shuttle: !!editing.has_shuttle,
      price_one_way: Number(editing.price_one_way) || 0,
      price_round_trip: Number(editing.price_round_trip) || 0,
      cover_image_url: editing.cover_image_url?.trim() || null,
      gallery_urls: editing.gallery_urls ?? [],
      sponsor_ids: editing.sponsor_ids ?? [],
      seo_title: editing.seo_title?.trim() || null,
      seo_description: editing.seo_description?.trim() || null,
      og_image_url: editing.og_image_url?.trim() || null,
      ...(shouldSetPublishedAt ? { published_at: new Date().toISOString() } : {}),
    };

    // Helper: insert con retry su unique-violation dello slug.
    const insertWithSlugRetry = async (
      payload: Record<string, unknown>,
    ) => {
      const baseSlug = String(payload.slug || slugify(editing.title!.trim()));
      for (let i = 0; i < 5; i++) {
        const candidate = i === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase
          .from("events")
          .insert({ ...payload, slug: candidate });
        if (!error) return;
        // 23505 = unique_violation
        const msg = (error.message || "").toLowerCase();
        const isUnique = msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505");
        if (!isUnique) throw error;
        if (i === 4) throw error;
      }
    };

    try {
      if (editing.id) {
        const { error } = await supabase.from("events").update(basePayload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Evento aggiornato" });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        await insertWithSlugRetry({
          ...basePayload,
          organizer_id: userData.user?.id ?? null,
        });
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
    events, categories, sponsors, loading, counts,
    editOpen, setEditOpen, editing, setEditing, openCreate, openEdit, saveEvent,
    deleteId, setDeleteId, removeEvent,
    uploadingCover, handleCoverUpload, removeCoverImage,
    uploadingGallery, handleGalleryUpload, removeGalleryImage,
    toggleSponsor,
    toggleField,
    editingBookedCount,
  };
};
