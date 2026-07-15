import { Link } from "react-router-dom";
import { Calendar, CalendarClock, Ticket, QrCode, Plus, ArrowRight, ScanLine } from "lucide-react";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAuth } from "@/hooks/useAuth";

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  icon: Icon,
  meta,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
  meta: string;
}) => (
  <div
    className="rounded-lg p-4 border flex min-h-24 flex-col justify-between"
    style={{
      background: "linear-gradient(145deg, #111111, #0A0A0A)",
      borderColor: "rgba(255,255,255,0.08)",
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-white/85">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div>
      <span className="text-3xl font-semibold text-white tabular-nums">{value.toLocaleString("it-IT")}</span>
      <p className="mt-1 text-xs text-primary">{meta}</p>
    </div>
  </div>
);

const MiniChart = ({ title, bars = false }: { title: string; bars?: boolean }) => (
  <div
    className="rounded-lg border p-4"
    style={{ backgroundColor: "#101010", borderColor: "rgba(255,255,255,0.08)" }}
  >
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    <div className="mt-4 h-36 rounded-md border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:44px_32px] p-3">
      {bars ? (
        <div className="flex h-full items-end gap-2">
          {[35, 72, 46, 82, 58, 90, 64, 96].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-primary" style={{ height: `${h}%`, opacity: i % 2 ? 1 : 0.55 }} />
          ))}
        </div>
      ) : (
        <svg viewBox="0 0 320 130" className="h-full w-full" role="img" aria-label={title}>
          <defs>
            <linearGradient id="admin-chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF9F00" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FF9F00" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 104 L46 90 L92 32 L138 70 L184 94 L230 76 L276 24 L320 18 L320 130 L0 130 Z" fill="url(#admin-chart-fill)" />
          <path d="M0 104 L46 90 L92 32 L138 70 L184 94 L230 76 L276 24 L320 18" fill="none" stroke="#FF9F00" strokeWidth="3" />
        </svg>
      )}
    </div>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    confirmed:  { label: "Confermata", color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
    cancelled:  { label: "Annullata",  color: "#f87171", bg: "rgba(248,113,113,0.08)" },
    pending:    { label: "In attesa",  color: "#8A8A8A", bg: "rgba(138,138,138,0.08)" },
  };
  const s = map[status] ?? { label: status, color: "#8A8A8A", bg: "rgba(138,138,138,0.08)" };
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ color: s.color, backgroundColor: s.bg, borderColor: `${s.color}33` }}
    >
      {s.label}
    </span>
  );
};

// ── AdminOverview ─────────────────────────────────────────────────────────────
const AdminOverview = () => {
  const { kpi, upcoming, recentBookings, loading, error } = useAdminOverview();
  const { user } = useAuth();
  const firstName = user?.email?.split("@")[0] ?? "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-5 md:space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary md:hidden">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Bentornato, {firstName}</h1>
          <p className="text-sm text-[#8A8A8A]">Ecco cosa sta succedendo oggi.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Link
            to="/admin/checkin/scan"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground md:hidden"
          >
            <ScanLine className="h-4 w-4" /> Scanner QR
          </Link>
          <Link
            to="/admin/eventi"
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-medium text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4 text-primary" /> Nuovo evento
          </Link>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl p-4 border text-sm text-red-400"
          style={{ borderColor: "rgba(248,113,113,0.2)", backgroundColor: "rgba(248,113,113,0.06)" }}
        >
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Eventi attivi" value={kpi.activeEvents} icon={Calendar} meta="live" />
        <KpiCard label="Prenotazioni" value={kpi.confirmedBookings30d} icon={Ticket} meta="ultimi 30 gg" />
        <KpiCard label="Check-in oggi" value={kpi.checkinsToday} icon={QrCode} meta="tempo reale" />
        <KpiCard label="Eventi futuri" value={kpi.upcomingEvents} icon={CalendarClock} meta="in arrivo" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MiniChart title="Prenotazioni (ultimi 7 giorni)" />
        <MiniChart title="Check-in (ultimi 7 giorni)" bars />
      </div>

      {/* Tables row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Prossimi eventi */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#111111" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-sm font-semibold text-white">Prossimi eventi</h2>
            <Link to="/admin/eventi" className="text-xs font-medium text-primary">Vedi tutti</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {loading ? (
              <p className="px-5 py-6 text-sm text-[#8A8A8A]">Caricamento...</p>
            ) : upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8A8A8A]">Nessun evento futuro.</p>
            ) : (
              upcoming.map((e) => (
                <Link
                  key={e.id}
                  to="/admin/eventi"
                  className="flex justify-between items-center px-5 py-3 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  onMouseEnter={(el) => (el.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(el) => (el.currentTarget.style.backgroundColor = "")}
                >
                  <div>
                    <div className="text-sm font-medium text-white">{e.title}</div>
                    <div className="text-xs text-[#8A8A8A] mt-0.5">{e.location ?? "—"}</div>
                  </div>
                  <div className="text-xs text-[#8A8A8A] shrink-0 ml-4">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString("it-IT") : "—"}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Ultime prenotazioni */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#111111" }}
        >
          <div
            className="px-5 py-3.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-sm font-semibold text-white">Ultime prenotazioni</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {loading ? (
              <p className="px-5 py-6 text-sm text-[#8A8A8A]">Caricamento...</p>
            ) : recentBookings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8A8A8A]">Nessuna prenotazione.</p>
            ) : (
              recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {b.full_name ?? b.email ?? "Ospite"}
                    </div>
                    <div className="text-[11px] text-[#8A8A8A] font-mono truncate mt-0.5">
                      {b.reference_code ?? b.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-[#8A8A8A]">
                      {new Date(b.booked_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                </div>
              ))

            )}
          </div>
        </div>
      </div>

      <Link
        to="/admin/checkin/scan"
        className="hidden md:flex items-center justify-end gap-2 text-sm font-medium text-primary"
      >
        Apri scanner QR <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
};

export default AdminOverview;
