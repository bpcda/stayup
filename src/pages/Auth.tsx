import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import stayupLogo from "@/assets/stayup-logo.png";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, session, isAdmin, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in admin → redirect to /admin
  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, session, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setSubmitting(false);

    if (error) {
      const msg = error.toLowerCase().includes("email not confirmed")
        ? t("auth.errors.notConfirmed")
        : error.toLowerCase().includes("invalid")
          ? t("auth.errors.invalid")
          : error;
      toast({ title: t("auth.errors.title"), description: msg, variant: "destructive" });
      return;
    }
    // Wait for isAdmin to update via listener; redirect handled by useEffect
    toast({ title: t("auth.success.title"), description: t("auth.success.message") });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img src={stayupLogo} alt="StayUp" className="mx-auto h-16 w-auto" />
          <CardTitle>{t("auth.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("auth.noSignup")}
            </p>
            <div className="text-center">
              <Link to="/" className="text-sm text-primary hover:underline">
                {t("common.home")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
