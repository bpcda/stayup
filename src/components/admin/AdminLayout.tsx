import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, ExternalLink } from "lucide-react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border px-3 sticky top-0 bg-background/95 backdrop-blur z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email} · {isAdmin ? "admin" : "organizer"}
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ExternalLink className="h-4 w-4 mr-1" /> Sito
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Esci
            </Button>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
