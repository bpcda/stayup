import { Card, CardContent } from "@/components/ui/card";

interface ShuttleStatsProps {
  stats: {
    totale: number;
    pagati: number;
    nonPagati: number;
    incasso: string;
    soloAndata: number;
    soloRitorno: number;
    andataRitorno: number;
    iscrittiOggi: number;
  };
}

export const ShuttleStats = ({ stats }: ShuttleStatsProps) => (
  <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-2xl font-bold text-primary sm:text-3xl">{stats.totale}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">Totale iscritti</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-2xl font-bold text-green-400 sm:text-3xl">{stats.pagati}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">Pagati</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-2xl font-bold text-red-400 sm:text-3xl">{stats.nonPagati}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">Non pagati</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-2xl font-bold text-primary sm:text-3xl">€{stats.incasso}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">Incasso totale</p>
        </CardContent>
      </Card>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-xl font-bold sm:text-2xl">{stats.soloAndata}</p>
          <p className="text-xs text-muted-foreground">Solo Andata</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-xl font-bold sm:text-2xl">{stats.soloRitorno}</p>
          <p className="text-xs text-muted-foreground">Solo Ritorno</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-xl font-bold sm:text-2xl">{stats.andataRitorno}</p>
          <p className="text-xs text-muted-foreground">Andata + Ritorno</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-4 text-center sm:pt-6">
          <p className="text-xl font-bold sm:text-2xl">{stats.iscrittiOggi}</p>
          <p className="text-xs text-muted-foreground">Iscritti oggi</p>
        </CardContent>
      </Card>
    </div>
  </>
);
