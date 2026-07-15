import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Hourglass, Loader2 } from "lucide-react";
import type { EventCapacityStatus } from "@/hooks/useWaitlist";
import { joinWaitlist } from "@/services/supabase/functions.service";

interface Props {
  eventId: string;
  status: EventCapacityStatus;
  onJoined: () => void;
}

/**
 * Sostituisce il CTA "Accreditati" quando l'evento è sold-out.
 * Mostra stato corrente in waitlist (#posizione / offerta in corso) oppure
 * il pulsante "Entra in lista d'attesa".
 */
const WaitlistCTA = ({ eventId, status, onJoined }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (status.my_status === "offered") {
    return (
      <Button disabled size="lg" className="w-full h-14 text-base font-bold uppercase rounded-full">
        Offerta inviata — controlla la tua email
      </Button>
    );
  }

  if (status.my_status === "waiting" && status.my_position !== null) {
    return (
      <Button disabled size="lg" variant="outline" className="w-full h-14 text-base font-bold uppercase rounded-full">
        <Hourglass className="h-4 w-4 mr-2" /> In lista d'attesa — posizione #{status.my_position}
      </Button>
    );
  }

  const handleJoin = async () => {
    if (!user) { navigate("/auth"); return; }
    setBusy(true);
    try {
      const { data, error } = await joinWaitlist({ event_id: eventId })
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let msg = error.message ?? "Errore";
        if (ctx && typeof ctx.json === "function") {
          try { msg = (await ctx.clone().json())?.message ?? msg; } catch { /* noop */ }
        }
        toast({ title: "Impossibile entrare in lista", description: msg, variant: "destructive" });
        return;
      }
      toast({
        title: "Sei in lista d'attesa",
        description: `Posizione #${(data as { position: number }).position}. Ti avviseremo via email se si libera un posto.`,
      });
      onJoined();
    } catch (e) {
      toast({ title: "Errore", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <Button
      onClick={handleJoin}
      disabled={busy}
      size="lg"
      className="w-full h-14 text-base font-bold uppercase rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hourglass className="h-4 w-4 mr-2" />}
      Entra in lista d'attesa
    </Button>
  );
};

export default WaitlistCTA;
