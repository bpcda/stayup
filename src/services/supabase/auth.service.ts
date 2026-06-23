/**
 * Supabase auth service — thin wrappers around `supabase.auth.*` matching the
 * surface area used by `src/hooks/useAuth.tsx`.
 *
 * Not wired anywhere yet. The migration of `useAuth` will switch its imports
 * to this file (see MIGRATION_PLAN.md §4 + Fase 3, step 13).
 */
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/integrations/supabase/client";

export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signUp({ email, password, name }: SignUpInput) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: name ? { full_name: name } : undefined },
  });
}

export async function signInWithPassword({ email, password }: SignInInput) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = getSupabaseBrowser();
  return supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthStateChange(
  cb: (session: Session | null) => void,
): () => void {
  const supabase = getSupabaseBrowser();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function updateProfileName(name: string) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.updateUser({ data: { full_name: name } });
}

export async function updateEmail(newEmail: string) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.updateUser({ email: newEmail });
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.updateUser({ password: newPassword });
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  const supabase = getSupabaseBrowser();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
