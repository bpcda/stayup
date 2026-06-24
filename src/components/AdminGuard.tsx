import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  requireRole?: "admin" | "organizer";
}

const AdminGuard = ({ children, requireRole = "organizer" }: Props) => {
  const { session, isAdmin, isOrganizer, loading, signOut } = useAuth();
  const allowed = requireRole === "admin" ? isAdmin : (isAdmin || isOrganizer);
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
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/auth" replace state={{ from }} />;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <h2 className="text-xl font-semibold">{t("auth.forbidden.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.forbidden.message")}</p>
            <Button onClick={signOut} variant="outline" className="w-full">
              {t("auth.signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
