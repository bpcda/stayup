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
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: t("auth.passwordTooShort"),
        description: t("auth.passwordMin", { count: 6 }),
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: t("reset.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast({ title: t("common.error"), description: error, variant: "destructive" });
      return;
    }
    toast({
      title: t("reset.updated"),
      description: t("reset.updatedDescription"),
    });
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle>{t("reset.title")}</CardTitle>
          <CardDescription>
            {t("reset.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("reset.newPassword")}</Label>
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
              <Label htmlFor="confirm">{t("reset.confirmPassword")}</Label>
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
              {submitting ? t("reset.updating") : t("reset.update")}
            </Button>
            <div className="text-center pt-2">
              <Link to="/auth" className="text-sm text-primary hover:underline">
                {t("reset.backToLogin")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
