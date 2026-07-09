import { NavLink, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Calendar, Ticket, QrCode, ScanLine, Users, Mail, Bus, Settings, Menu, Handshake,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  { to: "/admin/impostazioni", label: "Impostazioni", icon: Settings, adminOnly: true },
];

export const AdminMobileNav = () => {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Apri menu"
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[#D0D0D0] hover:bg-white/5"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-72 border-r"
        style={{ backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex items-center h-16 px-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Link to="/admin" onClick={() => setOpen(false)}>
            <img src={stayupLogo} alt="StayUp" className="h-7 w-auto" />
          </Link>
        </div>

        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#8A8A8A]">
            Gestione
          </span>
        </div>

        <nav className="px-2 space-y-0.5">
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
                  "admin-nav-item flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                  active ? "admin-nav-active" : "text-[#8A8A8A]",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[#8A8A8A]")} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default AdminMobileNav;
