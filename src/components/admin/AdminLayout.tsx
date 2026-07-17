import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ExternalLink, Bell, ScanLine, LayoutDashboard, Calendar, Ticket, Menu } from "lucide-react";
import stayupLogo from "@/assets/stayup-logo.png";
import { cn } from "@/lib/utils";

const mobileTabs = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/eventi", label: "Eventi", icon: Calendar },
  { to: "/admin/checkin/scan", label: "Scanner", icon: ScanLine, primary: true },
  { to: "/admin/prenotazioni", label: "Prenotazioni", icon: Ticket },
  { to: "/admin/checkin", label: "Altro", icon: Menu },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: "#050505" }}>
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 md:h-16 flex items-center gap-2 px-4 md:px-6 sticky top-0 z-20 border-b shrink-0"
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
            <img src={stayupLogo} alt="StayUp" width={45} height={28} className="h-7 w-auto" />
          </Link>

          {/* Spacer pushes actions right */}
          <div className="flex-1 md:hidden" />
          <div className="hidden md:block flex-1" />

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
        <main className="flex-1 min-w-0 p-3 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5"
        style={{ backgroundColor: "rgba(5,5,5,0.96)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] transition",
                active ? "text-primary" : "text-[#8A8A8A]",
                item.primary && "-mt-5",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center",
                  item.primary
                    ? "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(255,159,0,0.35)]"
                    : "h-6 w-6",
                )}
              >
                <Icon className={item.primary ? "h-6 w-6" : "h-5 w-5"} />
              </span>
              <span className={cn(item.primary && "font-semibold text-primary")}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminLayout;
