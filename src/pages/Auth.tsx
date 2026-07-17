import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { PRIVACY_POLICY_VERSION } from "@/lib/consent";
import stayupLogo from "@/assets/stayup-logo.png";
import { useTranslation } from "react-i18next";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.83 3.4 14.66 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.21-3.89 9.21-9.37 0-.63-.07-1.11-.16-1.6L12 10.2z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, session, loading } = useAuth();

  // Rotta di provenienza (impostata da UserGuard/AdminGuard) o ?next=...
  const fromState = (location.state as { from?: string } | null)?.from;
  const nextParam = searchParams.get("next");
  const redirectTarget =
    (fromState && fromState.startsWith("/") && fromState) ||
    (nextParam && nextParam.startsWith("/") && nextParam) ||
    "/";

  const [tab, setTab] = useState<"login" | "signup">("login");

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [sFirstName, setSFirstName] = useState("");
  const [sLastName, setSLastName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sCity, setSCity] = useState("");
  const [sPrivacy, setSPrivacy] = useState(false);
  const [sMarketing, setSMarketing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Mostra eventuali errori OAuth restituiti da /auth/callback.
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      toast({ title: t("auth.oauthFailed"), description: err, variant: "destructive" });
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (!loading && session) {
      navigate(redirectTarget, { replace: true });
    }
  }, [loading, session, navigate, redirectTarget]);

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
    toast({ title: t("auth.success.title"), description: t("auth.success.message") });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sPassword.length < 6) {
      toast({ title: t("auth.passwordTooShort"), description: t("auth.passwordMin", { count: 6 }), variant: "destructive" });
      return;
    }
    if (!sPrivacy) {
      toast({ title: t("auth.privacyRequired"), description: t("auth.privacyRequiredDescription"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(sEmail.trim().toLowerCase(), sPassword, {
      firstName: sFirstName.trim(),
      lastName: sLastName.trim(),
      phone: sPhone.trim(),
      city: sCity.trim(),
      privacyAccepted: true,
      privacyVersion: PRIVACY_POLICY_VERSION,
      marketingConsent: sMarketing,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.toLowerCase().includes("registered")
        ? t("auth.alreadyRegistered")
        : error;
      toast({ title: t("auth.signupError"), description: msg, variant: "destructive" });
      return;
    }
    toast({
      title: t("auth.signupSuccess"),
      description: t("auth.signupSuccessDescription"),
    });
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    // Passa la rotta di destinazione finale a /auth/callback come ?next=...
    const { error } = await signInWithGoogle(
      redirectTarget !== "/" ? redirectTarget : undefined
    );
    if (error) {
      setSubmitting(false);
      toast({ title: t("auth.googleError"), description: error, variant: "destructive" });
    }
    // Se non c'è errore il browser viene reindirizzato a Google; lasciamo
    // submitting=true per disabilitare il bottone durante il redirect.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <img src={stayupLogo} alt="StayUp" width={89} height={56} className="mx-auto h-14 w-auto" />
          <CardTitle>{t("auth.welcome")}</CardTitle>
          <CardDescription>{t("auth.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={submitting}
          >
            <GoogleIcon />
            {t("auth.continueGoogle")}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
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
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sFirstName">{t("auth.firstName")}</Label>
                    <Input
                      id="sFirstName"
                      value={sFirstName}
                      onChange={(e) => setSFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sLastName">{t("auth.lastName")}</Label>
                    <Input
                      id="sLastName"
                      value={sLastName}
                      onChange={(e) => setSLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sEmail">{t("auth.email")}</Label>
                  <Input
                    id="sEmail"
                    type="email"
                    value={sEmail}
                    onChange={(e) => setSEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sPassword">{t("auth.password")}</Label>
                  <Input
                    id="sPassword"
                    type="password"
                    value={sPassword}
                    onChange={(e) => setSPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                  <Label htmlFor="sPhone">{t("auth.phone")}</Label>
                    <Input
                      id="sPhone"
                      type="tel"
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="sCity">{t("auth.city")}</Label>
                    <Input
                      id="sCity"
                      value={sCity}
                      onChange={(e) => setSCity(e.target.value)}
                      autoComplete="address-level2"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <Checkbox
                      checked={sPrivacy}
                      onCheckedChange={(v) => setSPrivacy(v === true)}
                      aria-required="true"
                    />
                    <span className="leading-snug">
                      <span className="text-destructive mr-0.5">*</span>
                      {t("auth.acceptPrefix")}{" "}
                      <Link to="/privacy" className="underline" target="_blank">{t("privacy.title")}</Link>
                      {" "}{t("auth.acceptAnd")}{" "}
                      <Link to="/termini" className="underline" target="_blank">{t("terms.title")}</Link>.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <Checkbox
                      checked={sMarketing}
                      onCheckedChange={(v) => setSMarketing(v === true)}
                    />
                    <span className="leading-snug text-muted-foreground">
                      {t("auth.marketingConsent")}
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || !sPrivacy}>
                  {submitting ? t("auth.signingUp") : t("auth.createAccount")}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  {t("auth.privacyVersion")}: {PRIVACY_POLICY_VERSION}
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center pt-4">
            <Link to="/" className="text-sm text-primary hover:underline">
              {t("auth.backHome")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
