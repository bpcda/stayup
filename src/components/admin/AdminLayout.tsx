import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ExternalLink, Bell, ScanLine } from "lucide-react";
import stayupLogo from "@/assets/stayup-logo.png";
import { cn } from "@/lib/utils";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const { pathname } = useLocation();
  const isScanRoute = pathname === "/admin/checkin/scan";

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: "#050505" }}>
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center gap-3 px-4 md:px-6 sticky top-0 z-20 border-b shrink-0"
          style={{
            backgroundColor: "rgba(5,5,5,0.97)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Mobile: hamburger + logo */}
          <AdminMobileNav />
          <Link to="/admin" className="md:hidden flex items-center">
            <img src={stayupLogo} alt="StayUp" className="h-7 w-auto" />
          </Link>

          {/* Spacer pushes actions right */}
          <div className="flex-1" />

          <Link
            to="/"
            title="Vai al sito pubblico"
            className="text-[#8A8A8A] hover:text-white transition-colors flex items-center justify-center h-9 w-9 rounded-full"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={signOut}
            title="Esci"
            aria-label="Esci"
            className="text-[#8A8A8A] hover:text-white transition-colors flex items-center justify-center h-9 w-9 rounded-full"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <div className="hidden md:block h-4 w-px bg-white/10 mx-1" />

          <button
            title="Notifiche"
            className="hidden md:flex text-[#8A8A8A] hover:text-white transition-colors relative items-center justify-center h-8 w-8 rounded-full"
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
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Mobile floating scan QR button */}
      {!isScanRoute && (
        <Link
          to="/admin/checkin/scan"
          aria-label="Scansiona QR code"
          className={cn(
            "md:hidden fixed z-30 right-4 flex items-center justify-center h-14 w-14 rounded-full shadow-lg",
            "bg-primary text-primary-foreground active:scale-95 transition-transform",
          )}
          style={{
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
            boxShadow: "0 10px 30px rgba(255,159,0,0.35)",
          }}
        >
          <ScanLine className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
};

export default AdminLayout;
