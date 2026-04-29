import { Card } from "../ui/card"
import { CardContent } from "../ui/card"


const Statistics = (stats : any) => {
  return <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">{stats.totale}</p>
          <p className="text-sm text-muted-foreground">Totale iscritti</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.pagati}</p>
          <p className="text-sm text-muted-foreground">Pagati</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-red-400">{stats.nonPagati}</p>
          <p className="text-sm text-muted-foreground">Non pagati</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">€{stats.incasso}</p>
          <p className="text-sm text-muted-foreground">Incasso totale</p>
        </CardContent>
      </Card>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.soloAndata}</p>
          <p className="text-xs text-muted-foreground">Solo Andata</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.soloRitorno}</p>
          <p className="text-xs text-muted-foreground">Solo Ritorno</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.andataRitorno}</p>
          <p className="text-xs text-muted-foreground">Andata + Ritorno</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.iscrittiOggi}</p>
          <p className="text-xs text-muted-foreground">Iscritti oggi</p>
        </CardContent>
      </Card>
    </div>
  </>
}

export default Statistics;