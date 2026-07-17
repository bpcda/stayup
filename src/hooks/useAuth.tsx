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
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getSiteUrl } from "@/lib/siteUrl";

interface SignUpData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  privacyAccepted?: boolean;
  privacyVersion?: string;
  marketingConsent?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isOrganizer: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, data?: SignUpData) => Promise<{ error: string | null }>;
  /** Avvia OAuth con Google. `next` è la rotta dove tornare dopo il login. */
  signInWithGoogle: (next?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type RoleState = {
  isAdmin: boolean;
  isOrganizer: boolean;
};

const emptyRoles: RoleState = { isAdmin: false, isOrganizer: false };
const roleCache = new Map<string, RoleState>();
const roleRequests = new Map<string, Promise<RoleState>>();

const loadRoles = (uid: string): Promise<RoleState> => {
  const cached = roleCache.get(uid);
  if (cached) return Promise.resolve(cached);

  const inFlight = roleRequests.get(uid);
  if (inFlight) return inFlight;

  const request = Promise.all([
    supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: uid, _role: "organizer" }),
  ])
    .then(([adminRes, orgRes]) => {
      const roles = {
        isAdmin: Boolean(adminRes.data),
        isOrganizer: Boolean(orgRes.data),
      };
      roleCache.set(uid, roles);
      return roles;
    })
    .catch(() => emptyRoles)
    .finally(() => {
      roleRequests.delete(uid);
    });

  roleRequests.set(uid, request);
  return request;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const roleCheckId = useRef(0);

  const checkRoles = async (uid: string | null) => {
    const checkId = ++roleCheckId.current;

    if (!uid || !isSupabaseConfigured) {
      setIsAdmin(false);
      setIsOrganizer(false);
      return emptyRoles;
    }

    const roles = await loadRoles(uid);
    if (checkId === roleCheckId.current) {
      setIsAdmin(roles.isAdmin);
      setIsOrganizer(roles.isOrganizer);
    }
    return roles;
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
        checkRoles(newSession?.user?.id ?? null).finally(() => setLoading(false));
      }, 0);
    });

    // 2) Bootstrap della sessione persistita.
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await checkRoles(data.session?.user?.id ?? null);
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
    if (!data?.privacyAccepted) {
      return { error: "Devi accettare la Privacy Policy per registrarti." };
    }
    const fullName = `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();
    const redirectTo = `${getSiteUrl()}/`;
    const marketing = Boolean(data?.marketingConsent);

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
          privacy_accepted: "true",
          privacy_version: data?.privacyVersion,
          marketing_consent: marketing ? "true" : "false",
        },
      },
    });

    if (error) return { error: error.message };

    // Il trigger `handle_new_user` crea già la riga in `profiles` con i consensi
    // dal raw_user_meta_data. Se siamo già loggati (email confirmation off)
    // completiamo i campi anagrafici extra.
    const newUserId = signUpResult.user?.id;
    if (newUserId && signUpResult.session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data?.firstName || null,
          last_name: data?.lastName || null,
          full_name: fullName || null,
          phone: data?.phone || null,
          city: data?.city || null,
        })
        .eq("id", newUserId);
      if (profileError) {
        console.warn("[useAuth] profile post-signup update failed", profileError);
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async (next?: string) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const base = getSiteUrl();
    const nextParam =
      next && next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : "";
    const redirectTo = `${base}/auth/callback${nextParam}`;
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: "Nessun URL restituito" };
      window.location.href = data.url;
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Errore sconosciuto" };
    }
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
    setIsOrganizer(false);
    roleCache.clear();
    roleRequests.clear();
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured) return { error: "Auth non configurato" };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
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
        isOrganizer,
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
