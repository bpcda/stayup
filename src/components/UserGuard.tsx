/**
 * UserGuard — protezione delle rotte utente autenticato.
 *
 * Reindirizza a `/auth` se non c'è una sessione Supabase attiva, preservando
 * la rotta originale in `state.from` per permettere il redirect dopo login.
 * Non modifica nessuna UI esistente: è un wrapper invisibile.
 */
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
}

const UserGuard = ({ children }: Props) => {
  const { session, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default UserGuard;
