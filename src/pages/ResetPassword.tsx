/**
 * Pagina /reset-password.
 *
 * Atterraggio del link inviato da `supabase.auth.resetPasswordForEmail`.
 * Supabase processa automaticamente il token nella URL (`type=recovery`)
 * e crea una sessione temporanea; qui chiediamo all'utente di scegliere la
 * nuova password e la salviamo con `updatePassword`.
 *
 * UI minimale e coerente con `Auth.tsx` (nessuna modifica al login esistente).
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "Minimo 6 caratteri.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Errore", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Password aggiornata",
      description: "Ora puoi accedere con la nuova password.",
    });
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle>Imposta una nuova password</CardTitle>
          <CardDescription>
            Inserisci la nuova password per il tuo account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Conferma password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Aggiornamento..." : "Aggiorna password"}
            </Button>
            <div className="text-center pt-2">
              <Link to="/auth" className="text-sm text-primary hover:underline">
                Torna al login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
