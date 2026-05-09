import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { account, isAppwriteConfigured } from "@/lib/appwrite";
import { ID, AppwriteException, Models } from "appwrite";
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
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, data?: SignUpData) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to map Appwrite user to Supabase User interface to prevent breaking existing components
const mapAppwriteUserToSupabaseUser = (appwriteUser: Models.User<Models.Preferences>): User => {
  return {
    id: appwriteUser.$id,
    app_metadata: {},
    user_metadata: {
      first_name: appwriteUser.prefs?.firstName || appwriteUser.name?.split(' ')[0] || '',
      last_name: appwriteUser.prefs?.lastName || appwriteUser.name?.split(' ').slice(1).join(' ') || '',
      phone: appwriteUser.prefs?.phone || '',
      city: appwriteUser.prefs?.city || '',
    },
    aud: 'authenticated',
    created_at: appwriteUser.$createdAt,
    email: appwriteUser.email,
    phone: appwriteUser.phone,
    updated_at: appwriteUser.$updatedAt,
    role: 'authenticated',
    factors: [],
  } as unknown as User;
};

const mapAppwriteSessionToSupabaseSession = (appwriteSession: Models.Session, user: User): Session => {
  return {
    access_token: appwriteSession.$id,
    refresh_token: '',
    expires_in: 0,
    expires_at: new Date(appwriteSession.expire).getTime() / 1000,
    token_type: 'bearer',
    user: user,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check admin role for the current user (temporarily using Supabase RPC if still needed)
  const checkAdmin = async (uid: string | null) => {
    // If we have fully moved to Appwrite Auth, the UID won't exist in Supabase DB.
    // For now, we will safely set false if it fails.
    if (!uid || !isSupabaseConfigured) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data));
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const loadSession = async () => {
    if (!isAppwriteConfigured) {
      setLoading(false);
      return;
    }
    try {
      const appwriteSession = await account.getSession({ sessionId: 'current' });
      const appwriteUser = await account.get();

      const mappedUser = mapAppwriteUserToSupabaseUser(appwriteUser);
      const mappedSession = mapAppwriteSessionToSupabaseSession(appwriteSession, mappedUser);

      setSession(mappedSession);
      setUser(mappedUser);

      // We don't await checkAdmin here to avoid blocking UI unnecessarily
      checkAdmin(mappedUser.id);
    } catch (error) {
      // No active session
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isAppwriteConfigured) {
      return { error: "Auth non configurato" };
    }
    try {
      await account.createEmailPasswordSession({ email, password });
      await loadSession();
      return { error: null };
    } catch (error) {
      const e = error as AppwriteException;
      return { error: e.message ?? "Errore sconosciuto" };
    }
  };

  const signUp = async (email: string, password: string, data?: SignUpData) => {
    if (!isAppwriteConfigured) {
      return { error: "Auth non configurato" };
    }
    try {
      const name = `${data?.firstName || ''} ${data?.lastName || ''}`.trim();
      const newAccount = await account.create({
        userId: ID.unique(),
        email: email,
        password: password,
        name: name
      });

      // Attempt to set preferences if provided
      if (data) {
        // We need an active session to update preferences
        await account.createEmailPasswordSession({ email, password });
        await account.updatePrefs({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          city: data.city || ''
        });
        // We log out to keep the "verify your email" flow if desired, 
        // or we just keep them logged in. The current code did not explicitly log them out but didn't log them in either (Supabase default behavior depends on email confirmation settings).
        // The user mentioned SMTP is set up for Verification, so they might want to require email verification.
        // Let's create a verification if we want, but let's just log out for now to force login.
        // If we want to send verification email: await account.createVerification(`${window.location.origin}/verify`);
        await account.deleteSession({ sessionId: 'current' });
      }

      return { error: null };
    } catch (error) {
      const e = error as AppwriteException;
      return { error: e.message ?? "Errore sconosciuto" };
    }
  };

  const signInWithGoogle = async () => {
    if (!isAppwriteConfigured) {
      return { error: "Auth non configurato" };
    }
    try {
      // Appwrite OAuth2 implementation
      account.createOAuth2Session({
        provider: 'google' as any,
        success: `${window.location.origin}/`,
        failure: `${window.location.origin}/auth`
      });
      // It will redirect, so we just return null for now.
      return { error: null };
    } catch (error) {
      const e = error as AppwriteException;
      return { error: e.message ?? "Errore sconosciuto" };
    }
  };

  const signOut = async () => {
    if (isAppwriteConfigured) {
      try {
        await account.deleteSession({ sessionId: 'current' });
      } catch (e) {
        console.warn("Error during signout", e);
      }
    }
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
