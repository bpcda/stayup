import { ReactNode, useState, useRef, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Home, Calendar, User, LogIn, LogOut, Shield, Info, Mail, ChevronDown, Search, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";
import stayupLogo from "@/assets/stayup-logo.png";

// ── Desktop nav items (public) ──────────────────────────────────────────────
const desktopNavItems = [
  { to: "/", label: "Home", end: true },
  { to: "/eventi", label: "Eventi", end: false },
  { to: "/chi-siamo", label: "Chi siamo", end: false },
  { to: "/contatti", label: "Contatti", end: false },
];

// ── Mobile bottom nav (max 4 real routes) ───────────────────────────────────
const mobileNavItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/eventi", label: "Eventi", icon: Calendar, end: false },
  { to: "/chi-siamo", label: "Chi siamo", icon: Info, end: false },
];

// ── Profile dropdown ─────────────────────────────────────────────────────────
const ProfileDropdown = () => {
  const { user, signOut, isAdmin, isOrganizer } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 text-sm font-medium text-[#8A8A8A] hover:text-white transition-colors"
      >
        <LogIn className="h-4 w-4" />
        <span>Accedi</span>
      </Link>
    );
  }

  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-9 w-9 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors border border-white/10"
        aria-label="Menu profilo"
      >
        <User className="h-4 w-4 text-[#D0D0D0]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/8 bg-[#111111] shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/8">
            <p className="text-xs text-[#8A8A8A] truncate">{user.email}</p>
          </div>
          <div className="p-1">
            <Link
              to="/profilo"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#D0D0D0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              Profilo
            </Link>
            {(isAdmin || isOrganizer) && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#D0D0D0] hover:bg-white/5 hover:text-white transition-colors"
              >
                <Shield className="h-4 w-4 text-primary" />
                Dashboard
              </Link>
            )}
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#8A8A8A] hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Desktop Topbar ────────────────────────────────────────────────────────────
const Topbar = () => {
  const { user, isAdmin, isOrganizer } = useAuth();

  return (
    <header
      className="hidden md:flex sticky top-0 z-50 h-16 items-center gap-8 px-8 border-b"
      style={{
        backgroundColor: "rgba(5,5,5,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center shrink-0">
        <img src={stayupLogo} alt="StayUp" width={51} height={32} fetchPriority="high" className="h-8 w-auto" />
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-6 flex-1 ml-4">
        {desktopNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "relative text-sm font-medium pb-0.5 transition-colors",
                isActive
                  ? "text-white nav-active-underline"
                  : "text-[#8A8A8A] hover:text-white"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-5">
        <Link to="/eventi" className="text-[#8A8A8A] hover:text-white transition-colors" aria-label="Cerca eventi">
          <Search className="h-4 w-4" />
        </Link>
        <LanguageSwitcher />
        {(isAdmin || isOrganizer) && (
          <Link
            to="/admin"
            className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full border transition-colors"
            style={{
              borderColor: "rgba(255,159,0,0.4)",
              color: "#FF9F00",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,159,0,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Dashboard</span>
          </Link>
        )}
        <ProfileDropdown />
      </div>
    </header>
  );
};

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
const BottomNav = () => {
  const { user } = useAuth();

  const items = [
    ...mobileNavItems,
    {
      to: user ? "/profilo" : "/auth",
      label: user ? "Profilo" : "Accedi",
      icon: user ? User : LogIn,
      end: false,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t"
      style={{
        backgroundColor: "rgba(5,5,5,0.97)",
        borderColor: "rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-[#8A8A8A]"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

// ── Mobile topbar ─────────────────────────────────────────────────────────────
const MobileTopbar = () => {
  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b"
      style={{
        backgroundColor: "rgba(5,5,5,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <Link to="/">
        <img src={stayupLogo} alt="StayUp" width={45} height={28} fetchPriority="high" className="h-7 w-auto" />
      </Link>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ProfileDropdown />
      </div>
    </header>
  );
};

// ── AppLayout ─────────────────────────────────────────────────────────────────
const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  const isAuthRoute = location.pathname === "/auth";
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  if (isAuthRoute || isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#050505" }}>
      {/* Desktop topbar */}
      <Topbar />

      {/* Mobile topbar */}
      <MobileTopbar />

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <Footer />

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
