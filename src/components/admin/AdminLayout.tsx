import { ReactNode } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ExternalLink, Bell } from "lucide-react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: "#050505" }}>
      {/* Custom sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin topbar — minimal come da mockup */}
        <header
          className="h-16 flex items-center justify-end gap-5 px-6 sticky top-0 z-10 border-b shrink-0"
          style={{
            backgroundColor: "rgba(5,5,5,0.97)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Quick Actions (Sito, Esci, Notifiche, Avatar) */}
          <Link
            to="/"
            title="Vai al sito pubblico"
            className="text-[#8A8A8A] hover:text-white transition-colors flex items-center justify-center h-8 w-8 rounded-full"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={signOut}
            title="Esci"
            className="text-[#8A8A8A] hover:text-white transition-colors flex items-center justify-center h-8 w-8 rounded-full"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            title="Notifiche"
            className="text-[#8A8A8A] hover:text-white transition-colors relative flex items-center justify-center h-8 w-8 rounded-full"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          <div
            className="h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold text-white ml-1"
            style={{ backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }}
          >
            {initial}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
