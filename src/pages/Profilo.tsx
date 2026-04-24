import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Profilo = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Caricamento...</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Il mio profilo</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </header>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Dati</TabsTrigger>
          <TabsTrigger value="eventi">I miei eventi</TabsTrigger>
          <TabsTrigger value="sicurezza">Sicurezza</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dati personali</CardTitle>
              <CardDescription>Modifica le tue informazioni anagrafiche.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" placeholder="Mario" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input id="lastName" placeholder="Rossi" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" placeholder="+39 333 1234567" disabled />
              </div>
              <Button disabled>Salva (presto)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Il cambio email richiederà conferma sul nuovo indirizzo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email attuale</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
              <Button variant="outline" disabled>Cambia email (presto)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eventi" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Iscrizioni</CardTitle>
              <CardDescription>
                Qui troverai gli eventi a cui sei iscritto. [Placeholder — sarà collegato al backend]
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Nessuna iscrizione ancora visualizzabile.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sicurezza" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cambia password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="curr">Password attuale</Label>
                <Input id="curr" type="password" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Nuova password</Label>
                <Input id="new" type="password" disabled />
              </div>
              <Button disabled>Aggiorna password (presto)</Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Elimina account</CardTitle>
              <CardDescription>
                Operazione irreversibile. Verrà chiesta una conferma prima dell'eliminazione.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <Button variant="destructive" disabled>Elimina account (presto)</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profilo;
