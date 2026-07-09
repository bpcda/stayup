import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  QrCode,
  ScanLine,
  Users,
  Mail,
  Bus,
  Settings,
  Clock,
  Handshake,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import stayupLogo from "@/assets/stayup-logo.png";

interface Item {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  adminOnly?: boolean;
}

const items: Item[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/eventi", label: "Eventi", icon: Calendar },
  { to: "/admin/prenotazioni", label: "Prenotazioni", icon: Ticket },
  { to: "/admin/checkin", label: "Check-in", icon: QrCode, end: true },
  { to: "/admin/checkin/scan", label: "Scan QR", icon: ScanLine },
  { to: "/admin/utenti", label: "Utenti", icon: Users, adminOnly: true },
  { to: "/admin/email-logs", label: "Email logs", icon: Mail, adminOnly: true },
  { to: "/admin/shuttle", label: "Shuttle", icon: Bus, adminOnly: true },
  { to: "/admin/sponsor", label: "Sponsor", icon: Handshake, adminOnly: true },
  { to: "/admin/impostazioni", label: "Impostazioni", icon: Settings, adminOnly: true },
];

const AdminSidebar = () => {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 border-r"
      style={{
        backgroundColor: "#0A0A0A",
        borderColor: "rgba(255,255,255,0.08)",
        minHeight: "100vh",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-16 px-5 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <Link to="/admin">
          <img src={stayupLogo} alt="StayUp" className="h-7 w-auto" />
        </Link>
      </div>

      {/* Nav section label */}
      <div className="px-4 pt-5 pb-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#8A8A8A]">
          Gestione
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = item.end
            ? pathname === item.to
            : pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "admin-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                active
                  ? "admin-nav-active"
                  : "text-[#8A8A8A]"
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[#8A8A8A]")}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2 text-[10px] text-[#8A8A8A]">
          <Clock className="h-3.5 w-3.5" />
          <span>StayUp Admin</span>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
