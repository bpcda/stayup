import { Link } from "react-router-dom";

const TermsConditions = () => (
  <div className="min-h-screen px-4 py-8 md:py-16">
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold mb-8 font-heading">Termini e Condizioni</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Costo e Pagamento</h2>
          <p>La navetta ha un costo di <strong className="text-foreground">6€</strong> da inviare esclusivamente tramite PayPal "Beni e Servizi" al link fornito in descrizione o al link che verrà inviato tramite email.</p>
          <p><strong className="text-foreground">La navetta si ritiene prenotata solo e solamente all'avvenuto pagamento.</strong></p>
          <p>Non è possibile pagare in contanti o all'arrivo sul bus.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Cosa è compreso</h2>
          <p>Compreso nel prezzo avrete:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Andata in navetta</li>
            <li>Ritorno in navetta</li>
            <li>Un ticket per una birra in omaggio al Grill Contest</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Rimborsi</h2>
          <p>La restituzione dei soldi è possibile solamente nel caso in cui non saremo in grado di garantire il servizio.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Selezione alla salita</h2>
          <p>L'organizzazione si riserva la facoltà di selezione alla salita.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Variazione orari</h2>
          <p>L'organizzazione si riserva la possibilità di variare gli orari in base alla richiesta.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Contatti</h2>
          <p>Per info e domande: <strong className="text-foreground">3711082218</strong> (Benedetta)</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsConditions;
