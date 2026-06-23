/**
 * Auth context — Supabase Auth (esterno).
 *
 * Implementazione Supabase Auth mantenendo invariata la firma del
 * context (`AuthContextValue`): tutta la UI (`Auth.tsx`, `AdminGuard`,
 * `Profilo`, ecc.) continua a consumare gli stessi metodi.
 *
 * Flusso sessione:
 *   1. registriamo `onAuthStateChange` SUBITO (sincrono, no await dentro)
 *   2. poi facciamo `getSession()` per ripristinare lo stato iniziale
 *   3. il ruolo admin viene risolto in modo asincrono via `has_role` RPC
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

interface SignUpData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isOrganizer: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, data?: SignUpData) => Promise<{ error: string | null }>;
  /** Stub: struttura pronta, OAuth Google verrà abilitato in seguito. */
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRoles = async (uid: string | null) => {
    if (!uid || !isSupabaseConfigured) {
      setIsAdmin(false);
      setIsOrganizer(false);
      return;
    }
    try {
      const [adminRes, orgRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "organizer" }),
      ]);
      setIsAdmin(Boolean(adminRes.data));
      setIsOrganizer(Boolean(orgRes.data));
    } catch {
      setIsAdmin(false);
      setIsOrganizer(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1) Listener sincrono — niente await qui dentro per evitare deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Deferred per non bloccare il callback.
      setTimeout(() => {
        checkAdmin(newSession?.user?.id ?? null);
      }, 0);
    });

    // 2) Bootstrap della sessione persistita.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      checkAdmin(data.session?.user?.id ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, data?: SignUpData) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const fullName = `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();
    const redirectTo = `${window.location.origin}/`;

    const { data: signUpResult, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName || undefined,
          first_name: data?.firstName || undefined,
          last_name: data?.lastName || undefined,
          phone: data?.phone || undefined,
          city: data?.city || undefined,
        },
      },
    });

    if (error) return { error: error.message };

    // Il trigger `handle_new_user` crea già la riga in `profiles`. Se siamo
    // già loggati (email confirmation disabilitata) aggiorniamo i campi extra.
    const newUserId = signUpResult.user?.id;
    if (newUserId && signUpResult.session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          phone: data?.phone || null,
          city: data?.city || null,
        })
        .eq("id", newUserId);
      if (profileError) {
        // Non bloccante: profilo verrà completato dall'utente in seguito.
        console.warn("[useAuth] profile post-signup update failed", profileError);
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    // Struttura pronta per OAuth — verrà attivato in un task successivo.
    // Nessuna chiamata reale finché il provider non è configurato sul
    // progetto Supabase esterno.
    return {
      error: "Accesso con Google non ancora disponibile. Usa email e password.",
    };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Error during signout", e);
      }
    }
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAdmin,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
