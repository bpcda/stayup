import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ShuttleForm from "@/components/ShuttleForm";
import stayupLogo from "@/assets/stayup-logo.png";

const GrillContest = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <Link to="/">
            <img src={stayupLogo} alt="StayUp" className="w-24 h-auto" />
          </Link>
        </div>

        {/* Section 1: Event Info */}
        <section className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            Grill Contest Rivergaro
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
            Il Grill Contest di Rivergaro è uno dei festival BBQ più rinomati
            d'Italia, con oltre 40 food truck, DJ set e una storica gara
            barbecue lungo il fiume Trebbia.
          </p>
        </section>

        {/* Section 2: Shuttle Form */}
        <section className="bg-card rounded-2xl p-6 md:p-8 border border-border">
          <h2 className="text-xl font-semibold mb-6 font-heading text-center">
            Iscrizione Navetta
          </h2>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">Richiesta ricevuta!</h3>
              <p className="text-muted-foreground">
                Controlla la tua email per completare il pagamento.
              </p>
            </div>
          ) : (
            <ShuttleForm onSuccess={() => setSubmitted(true)} />
          )}
        </section>
      </div>
    </div>
  );
};

export default GrillContest;
