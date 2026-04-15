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
          <h2 className="text-xl font-semibold text-foreground">1. Oggetto del Servizio</h2>
          <p>Il presente documento disciplina le condizioni di utilizzo del servizio navetta organizzato da StayUp Events per il trasporto dei partecipanti al Grill Contest di Rivergaro.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Prenotazione</h2>
          <p>La prenotazione si intende confermata solo dopo il completamento del pagamento. La conferma verrà inviata all'indirizzo email indicato in fase di registrazione.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Pagamento</h2>
          <p>Il pagamento deve essere effettuato entro le modalità e i tempi indicati nell'email di conferma. In caso di mancato pagamento, la prenotazione sarà automaticamente cancellata.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Cancellazione e Rimborsi</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cancellazione fino a 48 ore prima della partenza: rimborso completo</li>
            <li>Cancellazione tra 48 e 24 ore prima: rimborso del 50%</li>
            <li>Cancellazione entro le 24 ore: nessun rimborso</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Obblighi del Passeggero</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Presentarsi alla fermata indicata almeno 5 minuti prima dell'orario previsto</li>
            <li>Esibire la conferma di prenotazione al controllore</li>
            <li>Mantenere un comportamento rispettoso durante il viaggio</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Responsabilità</h2>
          <p>StayUp Events non è responsabile per ritardi dovuti a cause di forza maggiore, condizioni del traffico o eventi imprevisti. In caso di cancellazione del servizio da parte dell'organizzatore, verrà garantito il rimborso completo.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Foro Competente</h2>
          <p>Per qualsiasi controversia derivante dall'utilizzo del servizio sarà competente il Foro di Piacenza.</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsConditions;
