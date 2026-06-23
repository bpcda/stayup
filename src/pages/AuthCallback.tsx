/**
 * /auth/callback — handler del redirect OAuth (Google).
 *
 * Il client Supabase è creato con `detectSessionInUrl: true`, quindi si occupa
 * automaticamente di leggere i token dall'hash e creare la sessione. Qui
 * aspettiamo che la sessione sia disponibile e poi reindirizziamo:
 *   - se la query contiene `next`, torniamo lì (deep-link dopo login);
 *   - altrimenti `/profilo`;
 *   - in caso di errore OAuth → `/auth?error=...`.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Accesso in corso…");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Errori restituiti dal provider OAuth (query o hash, secondo Supabase).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthError =
      params.get("error_description") ||
      params.get("error") ||
      hash.get("error_description") ||
      hash.get("error");

    if (oauthError) {
      setMessage("Errore di accesso. Reindirizzamento…");
      navigate(`/auth?error=${encodeURIComponent(oauthError)}`, { replace: true });
      return;
    }

    if (!isSupabaseConfigured) {
      navigate("/auth?error=Supabase%20non%20configurato", { replace: true });
      return;
    }

    const next = params.get("next");
    const fallback = "/profilo";

    const finish = (session: unknown) => {
      if (session) {
        const dest = next && next.startsWith("/") ? next : fallback;
        navigate(dest, { replace: true });
      } else {
        navigate("/auth?error=Sessione%20non%20trovata", { replace: true });
      }
    };

    // Il listener cattura l'evento SIGNED_IN emesso quando Supabase finisce
    // di scambiare il code/hash con una sessione.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        finish(session);
      }
    });

    // Failsafe: alcuni browser non emettono onAuthStateChange se il token era
    // già nello storage. Dopo un breve delay leggiamo direttamente la sessione.
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => finish(data.session));
    }, 1200);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default AuthCallback;
