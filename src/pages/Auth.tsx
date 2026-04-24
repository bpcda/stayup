import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import stayupLogo from "@/assets/stayup-logo.png";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.83 3.4 14.66 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.21-3.89 9.21-9.37 0-.63-.07-1.11-.16-1.6L12 10.2z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, session, loading } = useAuth();

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

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate("/", { replace: true });
    }
  }, [loading, session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (error) {
      const msg = error.toLowerCase().includes("email not confirmed")
        ? "Devi confermare l'email prima di accedere. Controlla la tua casella."
        : error.toLowerCase().includes("invalid")
          ? "Email o password non valide."
          : error;
      toast({ title: "Errore di accesso", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Accesso effettuato", description: "Benvenuto." });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sPassword.length < 6) {
      toast({ title: "Password troppo corta", description: "Minimo 6 caratteri.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(sEmail.trim().toLowerCase(), sPassword, {
      firstName: sFirstName.trim(),
      lastName: sLastName.trim(),
      phone: sPhone.trim(),
      city: sCity.trim(),
    });
    setSubmitting(false);
    if (error) {
      const msg = error.toLowerCase().includes("registered")
        ? "Questa email è già registrata. Accedi invece."
        : error;
      toast({ title: "Errore di registrazione", description: msg, variant: "destructive" });
      return;
    }
    toast({
      title: "Registrazione completata",
      description: "Controlla la tua email per confermare l'account.",
    });
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const { error } = await signInWithGoogle();
    setSubmitting(false);
    if (error) {
      toast({ title: "Errore Google", description: error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <img src={stayupLogo} alt="StayUp" className="mx-auto h-14 w-auto" />
          <CardTitle>Benvenuto in StayUp</CardTitle>
          <CardDescription>Accedi o crea un account per iscriverti agli eventi</CardDescription>
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
            Continua con Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">oppure</span>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="password">Password</Label>
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
                  {submitting ? "Accesso in corso..." : "Accedi"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sFirstName">Nome</Label>
                    <Input
                      id="sFirstName"
                      value={sFirstName}
                      onChange={(e) => setSFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sLastName">Cognome</Label>
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
                  <Label htmlFor="sEmail">Email</Label>
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
                  <Label htmlFor="sPassword">Password</Label>
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
                    <Label htmlFor="sPhone">Telefono</Label>
                    <Input
                      id="sPhone"
                      type="tel"
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sCity">Città</Label>
                    <Input
                      id="sCity"
                      value={sCity}
                      onChange={(e) => setSCity(e.target.value)}
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Registrazione..." : "Crea account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Registrandoti accetti i{" "}
                  <Link to="/termini" className="underline">Termini</Link> e la{" "}
                  <Link to="/privacy" className="underline">Privacy</Link>.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center pt-4">
            <Link to="/" className="text-sm text-primary hover:underline">
              Torna alla Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
