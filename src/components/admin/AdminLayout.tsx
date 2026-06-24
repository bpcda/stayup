import { ReactNode } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, ExternalLink } from "lucide-react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: "#050505" }}>
      {/* Custom sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin topbar */}
        <header
          className="h-14 flex items-center gap-3 px-5 sticky top-0 z-10 border-b shrink-0"
          style={{
            backgroundColor: "rgba(5,5,5,0.97)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Mobile: hamburger placeholder — sidebar hidden on mobile, accessible via profile */}
          <div className="flex-1" />

          <span className="text-xs text-[#8A8A8A] hidden sm:inline font-mono">
            {user?.email}
          </span>

          <span
            className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border"
            style={{
              color: "#FF9F00",
              borderColor: "rgba(255,159,0,0.3)",
              backgroundColor: "rgba(255,159,0,0.08)",
            }}
          >
            {isAdmin ? "admin" : "organizer"}
          </span>

          <Button asChild variant="ghost" size="sm" className="text-[#8A8A8A] hover:text-white">
            <Link to="/">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Sito
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-[#8A8A8A] hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Esci
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
