interface StatisticsProps {
  totale?: number;
  pagati?: number;
  nonPagati?: number;
  incasso?: number;
  soloAndata?: number;
  soloRitorno?: number;
  andataRitorno?: number;
  iscrittiOggi?: number;
}

const StatCard = ({
  value,
  label,
  accent = false,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) => (
  <div
    className="rounded-xl p-4 border flex flex-col gap-2"
    style={{
      backgroundColor: "#111111",
      borderColor: accent ? "rgba(255,159,0,0.2)" : "rgba(255,255,255,0.08)",
    }}
  >
    <span
      className="text-2xl font-bold tabular-nums"
      style={{ color: accent ? "#FF9F00" : "#ffffff" }}
    >
      {value}
    </span>
    <span className="text-xs text-[#8A8A8A] uppercase tracking-wider">{label}</span>
  </div>
);

const Statistics = (stats: StatisticsProps) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={stats.totale ?? 0}             label="Totale iscritti" />
        <StatCard value={stats.pagati ?? 0}             label="Pagati" />
        <StatCard value={stats.nonPagati ?? 0}          label="Non pagati" />
        <StatCard value={`€${stats.incasso ?? 0}`}      label="Incasso totale" accent />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={stats.soloAndata ?? 0}         label="Solo andata" />
        <StatCard value={stats.soloRitorno ?? 0}        label="Solo ritorno" />
        <StatCard value={stats.andataRitorno ?? 0}      label="Andata + ritorno" />
        <StatCard value={stats.iscrittiOggi ?? 0}       label="Iscritti oggi" />
      </div>
    </div>
  );
};

export default Statistics;