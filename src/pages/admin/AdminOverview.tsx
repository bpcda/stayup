import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, CalendarClock, Ticket, QrCode, MailCheck, MailX } from "lucide-react";
import { useAdminOverview } from "@/hooks/useAdminOverview";

const KpiCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="text-3xl font-bold">{value}</CardContent>
  </Card>
);

const AdminOverview = () => {
  const { kpi, upcoming, recentBookings, loading, error } = useAdminOverview();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold mb-1">Overview</h1>
        <p className="text-muted-foreground text-sm">Stato generale della piattaforma StayUp.</p>
      </header>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Utenti" value={kpi.users} icon={Users} />
        <KpiCard label="Eventi attivi" value={kpi.activeEvents} icon={Calendar} />
        <KpiCard label="Eventi futuri" value={kpi.upcomingEvents} icon={CalendarClock} />
        <KpiCard label="Prenotazioni (30gg)" value={kpi.confirmedBookings30d} icon={Ticket} />
        <KpiCard label="Check-in oggi" value={kpi.checkinsToday} icon={QrCode} />
        <KpiCard label="Email inviate (7gg)" value={kpi.emailsSent7d} icon={MailCheck} />
        <KpiCard label="Email fallite (7gg)" value={kpi.emailsBounced7d} icon={MailX} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Prossimi eventi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento futuro.</p>
            ) : (
              upcoming.map((e) => (
                <Link key={e.id} to="/admin/eventi" className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:text-primary transition-colors">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.location ?? "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString("it-IT") : "—"}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ultime prenotazioni</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna prenotazione.</p>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="text-sm font-mono">{b.reference_code ?? b.id.slice(0, 8)}</div>
                  <div className="flex items-center gap-3">
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                      {b.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(b.booked_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
