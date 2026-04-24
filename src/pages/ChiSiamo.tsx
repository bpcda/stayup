import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChiSiamo = () => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Chi siamo</h1>
        <p className="text-muted-foreground text-lg">
          La nostra storia, la nostra missione, la nostra community.
        </p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>La nostra storia</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            [Placeholder] Racconta qui chi siete, come è nato il progetto, le persone dietro StayUp.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cosa facciamo</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            [Placeholder] Descrivi gli eventi che organizzate, i servizi offerti e i valori che vi guidano.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Il team</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            [Placeholder] Presenta i membri del team con foto e ruoli.
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ChiSiamo;
