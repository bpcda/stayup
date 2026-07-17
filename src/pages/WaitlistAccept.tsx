import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { acceptWaitlistOffer } from "@/services/supabase/functions.service";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; eventSlug: string }
    | { kind: "err"; code: string; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setState({ kind: "err", code: "no_token", message: t("waitlistAccept.invalidLink") }); return; }
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/waitlist/accept?token=${token}`)}`, { replace: true });
      return;
    }
    if (state.kind !== "idle") return;
    void (async () => {
      setState({ kind: "loading" });
      const { data, error } = await acceptWaitlistOffer({ token });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let code = "rpc_failed";
        let message = error.message ?? t("common.error");
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
  }, [authLoading, user, token, navigate, state.kind, t]);

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          {state.kind === "loading" || state.kind === "idle" ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{t("waitlistAccept.checking")}</p>
            </>
          ) : state.kind === "ok" ? (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
              <h1 className="text-2xl font-bold">{t("waitlistAccept.confirmed")}</h1>
              <p className="text-muted-foreground">
                {t("waitlistAccept.confirmedDescription")}
              </p>
              <Button asChild className="w-full mt-4">
                <Link to={`/eventi/${state.eventSlug}`}>{t("waitlistAccept.goToEvent")}</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <h1 className="text-2xl font-bold">{t("waitlistAccept.invalidOffer")}</h1>
              <p className="text-muted-foreground">{state.message}</p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/eventi">{t("waitlistAccept.viewEvents")}</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitlistAccept;
