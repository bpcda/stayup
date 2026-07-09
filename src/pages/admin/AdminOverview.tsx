import { Link } from "react-router-dom";
import { Users, Calendar, CalendarClock, Ticket, QrCode, MailCheck, MailX } from "lucide-react";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { cn } from "@/lib/utils";

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) => (
  <div
    className="rounded-xl p-4 border flex flex-col gap-3"
    style={{
      backgroundColor: "#111111",
      borderColor: "rgba(255,255,255,0.08)",
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wider">{label}</span>
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: "rgba(255,159,0,0.1)" }}
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
    </div>
    <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
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

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-[#8A8A8A]">Stato generale della piattaforma StayUp.</p>
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
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Utenti"              value={kpi.users}                icon={Users}        />
        <KpiCard label="Eventi attivi"       value={kpi.activeEvents}          icon={Calendar}     />
        <KpiCard label="Eventi futuri"       value={kpi.upcomingEvents}        icon={CalendarClock}/>
        <KpiCard label="Prenotazioni 30gg"   value={kpi.confirmedBookings30d}  icon={Ticket}       />
        <KpiCard label="Check-in oggi"       value={kpi.checkinsToday}         icon={QrCode}       />
        <KpiCard label="Email inviate 7gg"   value={kpi.emailsSent7d}          icon={MailCheck}    />
        <KpiCard label="Email fallite 7gg"   value={kpi.emailsBounced7d}       icon={MailX}        />
      </div>

      {/* Tables row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Prossimi eventi */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#111111" }}
        >
          <div
            className="px-5 py-3.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-sm font-semibold text-white">Prossimi eventi</h2>
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
          className="rounded-xl border overflow-hidden"
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
    </div>
  );
};

export default AdminOverview;
