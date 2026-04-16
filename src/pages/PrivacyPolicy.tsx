import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <div className="min-h-screen px-4 py-8 md:py-16">
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold mb-8 font-heading">Informativa sulla Privacy</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Titolare del Trattamento</h2>
          <p>Il titolare del trattamento dei dati personali è StayUp All Night ("StayUp"), contattabile all'indirizzo email: info@stayupallnight.it</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Dati Raccolti</h2>
          <p>Raccogliamo i seguenti dati personali attraverso il modulo di prenotazione navetta:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nome e Cognome</li>
            <li>Indirizzo email</li>
            <li>Numero di telefono</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Finalità del Trattamento</h2>
          <p>I dati personali sono trattati per le seguenti finalità:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestione della prenotazione del servizio navetta</li>
            <li>Comunicazioni relative al servizio prenotato (conferma, variazioni, cancellazioni)</li>
            <li>Gestione del pagamento</li>
            <li>Adempimento di obblighi di legge</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Base Giuridica</h2>
          <p>Il trattamento è basato sul consenso dell'interessato (art. 6, par. 1, lett. a del GDPR) e sull'esecuzione di un contratto (art. 6, par. 1, lett. b del GDPR).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Conservazione dei Dati</h2>
          <p>I dati personali saranno conservati per il tempo strettamente necessario alla gestione del servizio e comunque non oltre 12 mesi dalla data dell'evento, salvo obblighi di legge.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Diritti dell'Interessato</h2>
          <p>Ai sensi degli articoli 15-22 del GDPR, l'utente ha diritto di:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accedere ai propri dati personali</li>
            <li>Rettificare dati inesatti</li>
            <li>Ottenere la cancellazione dei dati</li>
            <li>Limitare il trattamento</li>
            <li>Opporsi al trattamento</li>
            <li>Portabilità dei dati</li>
          </ul>
          <p className="mt-2">Per esercitare tali diritti, contattare: info@stayupallnight.it</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Sicurezza</h2>
          <p>Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita o distruzione.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
