import { useEffect, useRef, useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Camera, CameraOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackState {
  kind: "ok" | "err";
  title: string;
  subtitle?: string | null;
  at: number;
}

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onScan: (token: string) => Promise<{ ok: true; name: string | null; reference_code: string | null } | { ok: false; error: string }>;
}

// Evita di processare ripetutamente lo stesso codice (scanner emette N volte/sec)
const COOLDOWN_MS = 2500;

const vibrate = (pattern: number | number[]) => {
  try { (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.(pattern); } catch { /* noop */ }
};

export const QrScannerPanel = ({ enabled, onToggle, onScan }: Props) => {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const lastRef = useRef<{ token: string; at: number } | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleDetected = async (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue?.trim();
    if (!raw || processingRef.current) return;
    const now = Date.now();
    if (lastRef.current && lastRef.current.token === raw && now - lastRef.current.at < COOLDOWN_MS) return;
    lastRef.current = { token: raw, at: now };

    processingRef.current = true;
    const res = await onScan(raw);
    processingRef.current = false;

    if (res.ok) {
      vibrate(120);
      setFeedback({
        kind: "ok",
        title: "Check-in OK",
        subtitle: res.name ?? res.reference_code ?? null,
        at: now,
      });
    } else {
      vibrate([60, 80, 60]);
      const errMsg = "error" in res ? res.error : "Errore";
      setFeedback({ kind: "err", title: errMsg, at: now });
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-black">
        {enabled ? (
          <Scanner
            onScan={handleDetected}
            onError={() => { /* handled by overlay */ }}
            constraints={{ facingMode: "environment" }}
            scanDelay={250}
            styles={{
              container: { width: "100%", height: "100%" },
              video: { width: "100%", height: "100%", objectFit: "cover" },
            }}
            components={{ audio: false, finder: true, torch: true }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <CameraOff className="h-10 w-10" />
            <p className="text-sm">Fotocamera spenta</p>
          </div>
        )}

        {feedback && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center backdrop-blur-sm transition ${
              feedback.kind === "ok" ? "bg-emerald-500/80" : "bg-destructive/80"
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.kind === "ok" ? (
              <CheckCircle2 className="h-20 w-20 text-white" />
            ) : (
              <XCircle className="h-20 w-20 text-white" />
            )}
            <p className="text-xl font-bold text-white">{feedback.title}</p>
            {feedback.subtitle && (
              <p className="text-sm text-white/90 font-mono">{feedback.subtitle}</p>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant={enabled ? "outline" : "default"}
        size="lg"
        className="w-full h-12"
        onClick={() => onToggle(!enabled)}
      >
        {enabled ? (
          <><CameraOff className="h-4 w-4 mr-2" /> Spegni fotocamera</>
        ) : (
          <><Camera className="h-4 w-4 mr-2" /> Avvia scansione QR</>
        )}
      </Button>
    </div>
  );
};
