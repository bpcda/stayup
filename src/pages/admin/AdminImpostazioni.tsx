import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invalidateSiteSettings } from "@/hooks/useSiteSettings";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

type Row = { key: string; value: string | null; description: string | null };

const FIELDS: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "contact_phone",     label: "Telefono di contatto",     placeholder: "+39 333 123 4567", type: "tel" },
  { key: "contact_email",     label: "Email di contatto",        placeholder: "info@stayup.it",   type: "email" },
  { key: "contact_whatsapp",  label: "WhatsApp (con prefisso)",  placeholder: "393331234567",     type: "tel" },
  { key: "contact_instagram", label: "Instagram (senza @)",      placeholder: "stayup.official" },
];

const AdminImpostazioni = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value, description");
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        const map: Record<string, Row> = {};
        const vals: Record<string, string> = {};
        (data as Row[] ?? []).forEach((r) => { map[r.key] = r; vals[r.key] = r.value ?? ""; });
        FIELDS.forEach((f) => { if (vals[f.key] === undefined) vals[f.key] = ""; });
        setRows(map);
        setValues(vals);
      }
      setLoading(false);
    })();
  }, [toast]);

  const save = async () => {
    setSaving(true);
    const payload = FIELDS.map((f) => ({
      key: f.key,
      value: values[f.key] ?? "",
      description: rows[f.key]?.description ?? f.label,
    }));
    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    invalidateSiteSettings();
    toast({ title: "Impostazioni salvate" });
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-10">
      <AdminPageHeader
        title="Impostazioni"
        description="Dati globali del sito (contatti, social) usati nelle pagine pubbliche."
        actions={
          <Button onClick={save} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvo…" : "Salva"}
          </Button>
        }
      />

      <Card>
        <CardContent className="py-6 space-y-5">
          {loading ? (
            <p className="text-center text-muted-foreground py-6">Caricamento…</p>
          ) : (
            FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
                {rows[f.key]?.description && (
                  <p className="text-xs text-muted-foreground">{rows[f.key].description}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImpostazioni;
