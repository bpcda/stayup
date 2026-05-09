import { Session, User } from "@supabase/supabase-js";
import { Models } from "appwrite";

export interface SignUpData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, data?: SignUpData) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export interface UserPrefs extends Models.Preferences {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
}
