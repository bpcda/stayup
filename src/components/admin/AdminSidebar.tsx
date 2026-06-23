import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  QrCode,
  Users,
  Mail,
  Bus,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  adminOnly?: boolean;
}

const items: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/eventi", label: "Eventi", icon: Calendar },
  { to: "/admin/prenotazioni", label: "Prenotazioni", icon: Ticket },
  { to: "/admin/checkin", label: "Check-in", icon: QrCode },
  { to: "/admin/utenti", label: "Utenti", icon: Users, adminOnly: true },
  { to: "/admin/email-logs", label: "Email logs", icon: Mail, adminOnly: true },
  { to: "/admin/shuttle", label: "Shuttle", icon: Bus },
  { to: "/admin/impostazioni", label: "Impostazioni", icon: Settings, adminOnly: true },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const collapsed = state === "collapsed";

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const Icon = item.icon;
                const active = item.end
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.to} end={item.end} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
