import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SponsorRow } from "@/interfaces/events";

export type SponsorTier = "platinum" | "gold" | "silver" | "bronze" | "partner";

export interface SponsorEditable {
  id?: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  tier: SponsorTier;
  is_active: boolean;
  sort_order: number;
}

export interface FullSponsor extends SponsorRow {
  slug: string;
  description: string | null;
  website_url: string | null;
  sort_order: number;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sponsor";

export const emptySponsor = (): SponsorEditable => ({
  slug: "",
  name: "",
  description: "",
  logo_url: "",
  website_url: "",
  tier: "partner",
  is_active: true,
  sort_order: 0,
});

export const useAdminSponsors = () => {
  const { toast } = useToast();
  const [sponsors, setSponsors] = useState<FullSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SponsorEditable | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSponsors = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("sponsors")
      .select("id, slug, name, description, logo_url, website_url, tier, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      setSponsors((data ?? []) as FullSponsor[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSponsors(); }, []);

  const openCreate = () => { setEditing(emptySponsor()); setEditOpen(true); };
  const openEdit = (s: FullSponsor) => {
    setEditing({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description ?? "",
      logo_url: s.logo_url ?? "",
      website_url: s.website_url ?? "",
      tier: (s.tier as SponsorTier) ?? "partner",
      is_active: !!s.is_active,
      sort_order: s.sort_order ?? 0,
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Nome obbligatorio", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      slug: (editing.slug?.trim() || slugify(editing.name)).slice(0, 80),
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      logo_url: editing.logo_url?.trim() || null,
      website_url: editing.website_url?.trim() || null,
      tier: editing.tier,
      is_active: !!editing.is_active,
      sort_order: Number(editing.sort_order) || 0,
    };
    try {
      if (editing.id) {
        const { error } = await supabase.from("sponsors").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Sponsor aggiornato" });
      } else {
        const { error } = await supabase.from("sponsors").insert(payload);
        if (error) throw error;
        toast({ title: "Sponsor creato" });
      }
      setEditOpen(false);
      setEditing(null);
      fetchSponsors();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: msg, variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("sponsors").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sponsor eliminato" });
      setSponsors((prev) => prev.filter((s) => s.id !== deleteId));
    }
    setDeleteId(null);
  };

  const toggleActive = async (s: FullSponsor) => {
    const next = !s.is_active;
    setSponsors((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: next } : x));
    const { error } = await supabase.from("sponsors").update({ is_active: next }).eq("id", s.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setSponsors((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !next } : x));
    }
  };

  return {
    sponsors, loading,
    editing, setEditing, editOpen, setEditOpen, openCreate, openEdit, save, saving,
    deleteId, setDeleteId, remove,
    toggleActive,
  };
};
