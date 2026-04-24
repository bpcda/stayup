import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Info, Calendar, Mail, User, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";
import stayupLogo from "@/assets/stayup-logo.png";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: typeof Home };

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/eventi", label: "Eventi", icon: Calendar },
  { to: "/chi-siamo", label: "Chi siamo", icon: Info },
  { to: "/contatti", label: "Contatti", icon: Mail },
];

const SideLink = ({ item, collapsed }: { item: NavItem; collapsed: boolean }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          "hover:bg-secondary/60 text-muted-foreground hover:text-foreground",
          isActive && "bg-secondary text-foreground",
          collapsed && "justify-center px-2"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
};

const BottomNav = () => {
  const { user } = useAuth();
  const items: NavItem[] = [
    ...navItems,
    { to: user ? "/profilo" : "/auth", label: user ? "Profilo" : "Accedi", icon: user ? User : LogIn },
  ];
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{it.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();

  // Hide chrome on auth screen for cleaner UX
  const isAuthRoute = location.pathname === "/auth";

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const collapsed = false; // reserved for future user toggle

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card/40 backdrop-blur",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 h-16 border-b border-border", collapsed && "justify-center px-2")}>
          <img src={stayupLogo} alt="StayUp" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((it) => (
            <SideLink key={it.to} item={it} collapsed={collapsed} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border space-y-1">
          {user ? (
            <>
              <SideLink item={{ to: "/profilo", label: "Profilo", icon: User }} collapsed={collapsed} />
              {isAdmin && (
                <SideLink item={{ to: "/admin", label: "Admin", icon: User }} collapsed={collapsed} />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={cn("w-full justify-start gap-3 text-muted-foreground", collapsed && "justify-center")}
              >
                <LogOut className="h-5 w-5" />
                {!collapsed && <span>Esci</span>}
              </Button>
            </>
          ) : (
            <SideLink item={{ to: "/auth", label: "Accedi", icon: LogIn }} collapsed={collapsed} />
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur">
          <img src={stayupLogo} alt="StayUp" className="h-7 w-auto" />
          <LanguageSwitcher />
        </header>

        {/* Desktop top bar (lang switcher) */}
        <div className="hidden md:flex justify-end px-6 h-12 items-center border-b border-border">
          <LanguageSwitcher />
        </div>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
};

export default AppLayout;
