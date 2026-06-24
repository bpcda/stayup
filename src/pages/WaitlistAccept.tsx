import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * /waitlist/accept?token=<uuid>
 * Pagina che converte un'offerta waitlist in una prenotazione confermata.
 * Richiede sessione: se l'utente non è loggato lo mandiamo a /auth e
 * ritorniamo qui dopo il login.
 */
const WaitlistAccept = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; eventSlug: string }
    | { kind: "err"; code: string; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setState({ kind: "err", code: "no_token", message: "Link non valido." }); return; }
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/waitlist/accept?token=${token}`)}`, { replace: true });
      return;
    }
    if (state.kind !== "idle") return;
    void (async () => {
      setState({ kind: "loading" });
      const { data, error } = await supabase.functions.invoke("accept-waitlist-offer", {
        body: { token },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let code = "rpc_failed";
        let message = error.message ?? "Errore";
        if (ctx && typeof ctx.json === "function") {
          try {
            const j = await ctx.clone().json();
            code = j?.error ?? code;
            message = j?.message ?? message;
          } catch { /* noop */ }
        }
        setState({ kind: "err", code, message });
        return;
      }
      setState({ kind: "ok", eventSlug: (data as { event_slug: string }).event_slug });
    })();
  }, [authLoading, user, token, navigate, state.kind]);

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          {state.kind === "loading" || state.kind === "idle" ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Verifica offerta in corso…</p>
            </>
          ) : state.kind === "ok" ? (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
              <h1 className="text-2xl font-bold">Posto confermato!</h1>
              <p className="text-muted-foreground">
                Ti abbiamo inviato l'email con la conferma e il QR code.
              </p>
              <Button asChild className="w-full mt-4">
                <Link to={`/eventi/${state.eventSlug}`}>Vai all'evento</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <h1 className="text-2xl font-bold">Offerta non valida</h1>
              <p className="text-muted-foreground">{state.message}</p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/eventi">Vedi gli eventi</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitlistAccept;
