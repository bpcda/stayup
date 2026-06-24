import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Shield, ArrowRight, User, Lock, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import MyEvents from "@/components/profilo/MyEvents";
import MyWaitlist from "@/components/profilo/MyWaitlist";

const Profilo = () => {
  const { user, loading: authLoading, signOut, isAdmin, isOrganizer } = useAuth();
  const { profile, loading: profileLoading, update, setMarketingConsent } = useProfile();
  const { toast } = useToast();
  const [savingConsent, setSavingConsent] = useState(false);

  const [firstName, setFirstName]           = useState("");
  const [lastName, setLastName]             = useState("");
  const [phone, setPhone]                   = useState("");
  const [city, setCity]                     = useState("");
  const [savingProfile, setSavingProfile]   = useState(false);

  const [newEmail, setNewEmail]             = useState("");
  const [emailLoading, setEmailLoading]     = useState(false);

  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading]           = useState(false);

  const [deleting, setDeleting]             = useState(false);

  // Hydrate inputs once profile loads
  if (profile && firstName === "" && lastName === "" && phone === "" && city === "") {
    if (profile.first_name || profile.last_name || profile.phone || profile.city) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
      setCity(profile.city ?? "");
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#8A8A8A]">
        Caricamento...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await update({
      first_name: firstName || null,
      last_name:  lastName  || null,
      phone:      phone     || null,
      city:       city      || null,
    });
    setSavingProfile(false);
    toast({
      title:       error ? "Errore" : "Profilo aggiornato",
      description: error ?? "Le modifiche sono state salvate.",
      variant:     error ? "destructive" : "default",
    });
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: "Email aggiornata", description: "Controlla la tua nuova casella di posta per confermare." });
      setNewEmail("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setEmailLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password troppo corta", description: "Minimo 8 caratteri.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Le password non coincidono", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password aggiornata", description: "Usa la nuova password al prossimo accesso." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setPwLoading(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      const result = data as { error?: string } | null;
      if (result?.error) throw new Error(result.error);
      toast({ title: "Account eliminato", description: "Ci dispiace vederti andare." });
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      {/* Profile header */}
      <header className="mb-10 flex items-center gap-5">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
          style={{ backgroundColor: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {initial}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Il mio profilo</h1>
          <p className="text-[#8A8A8A] text-sm mt-0.5">{user.email}</p>
        </div>
      </header>

      {/* Admin card — shown only for admin/organizer */}
      {(isAdmin || isOrganizer) && (
        <div
          className="mb-8 rounded-2xl border p-5 flex items-start gap-4"
          style={{
            borderColor: "rgba(255,159,0,0.3)",
            backgroundColor: "rgba(255,159,0,0.06)",
          }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,159,0,0.15)" }}
          >
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Area amministrativa</p>
            <p className="text-xs text-[#8A8A8A] mt-0.5 leading-relaxed">
              Gestisci eventi, prenotazioni, check-in e lista d'attesa.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/admin" className="flex items-center gap-1.5">
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Dati
          </TabsTrigger>
          <TabsTrigger value="eventi" className="flex items-center gap-1.5">
            <List className="h-3.5 w-3.5" /> I miei eventi
          </TabsTrigger>
          <TabsTrigger value="sicurezza" className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Sicurezza
          </TabsTrigger>
        </TabsList>

        {/* ── Dati ── */}
        <TabsContent value="info" className="mt-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Dati personali</CardTitle>
              <CardDescription>Modifica le tue informazioni anagrafiche.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Mario" disabled={profileLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rossi" disabled={profileLoading} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 1234567" disabled={profileLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Città</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Rivergaro" disabled={profileLoading} />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile || profileLoading}>
                {savingProfile ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Il cambio email richiederà conferma sul nuovo indirizzo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email attuale</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Nuova email</Label>
                <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuova@email.com" />
              </div>
              <Button variant="outline" onClick={handleChangeEmail} disabled={emailLoading || !newEmail}>
                {emailLoading ? "Invio..." : "Cambia email"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy e consensi</CardTitle>
              <CardDescription>Gestisci i consensi che hai prestato. Puoi revocarli in qualsiasi momento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-start justify-between gap-4 rounded-xl border p-4"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-white">Comunicazioni marketing</div>
                  <p className="text-xs text-[#8A8A8A]">
                    Ricevi aggiornamenti su nuovi eventi e iniziative.
                    {profile?.marketing_consent && profile.marketing_consent_at && (
                      <> Consenso prestato il {new Date(profile.marketing_consent_at).toLocaleDateString("it-IT")}.</>
                    )}
                  </p>
                </div>
                <Switch
                  checked={Boolean(profile?.marketing_consent)}
                  disabled={savingConsent || profileLoading}
                  onCheckedChange={async (v) => {
                    setSavingConsent(true);
                    const { error } = await setMarketingConsent(v);
                    setSavingConsent(false);
                    toast({
                      title:       error ? "Errore" : v ? "Consenso marketing attivo" : "Consenso marketing revocato",
                      description: error ?? undefined,
                      variant:     error ? "destructive" : "default",
                    });
                  }}
                />
              </div>

              <div
                className="rounded-xl border p-4 text-xs text-[#8A8A8A] space-y-1"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div>
                  <span className="font-medium text-white">Privacy Policy accettata: </span>
                  {profile?.privacy_accepted_at
                    ? new Date(profile.privacy_accepted_at).toLocaleString("it-IT")
                    : "—"}
                </div>
                <div>
                  <span className="font-medium text-white">Versione policy: </span>
                  {profile?.privacy_version ?? "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── I miei eventi ── */}
        <TabsContent value="eventi" className="mt-0 space-y-5">
          <MyWaitlist />
          <MyEvents />
        </TabsContent>

        {/* ── Sicurezza ── */}
        <TabsContent value="sicurezza" className="mt-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Cambia password</CardTitle>
              <CardDescription>Inserisci una nuova password (minimo 8 caratteri).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new">Nuova password</Label>
                <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Conferma nuova password</Label>
                <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={pwLoading || !newPassword}>
                {pwLoading ? "Aggiornamento..." : "Aggiorna password"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Elimina account</CardTitle>
              <CardDescription>
                Operazione irreversibile. L'account e i dati associati verranno rimossi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? "Eliminazione..." : "Elimina account"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione non può essere annullata. L'account verrà eliminato definitivamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>Elimina</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profilo;
