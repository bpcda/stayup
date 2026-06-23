import { useCallback, useEffect, useRef, useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import {
  Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Pause, Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  validateAndCheckInByQrToken,
  type CheckinScanResult,
} from "@/services/supabase/checkin.service";

/**
 * /admin/checkin/scan
 *
 * Scanner QR indipendente dall'evento: l'evento viene determinato dal QR
 * tramite la RPC checkin_by_qr_token. Scanner continuo con anti doppia lettura
 * (debounce + cooldown + isProcessing), feedback visivo e auto-resume.
 */

const COOLDOWN_MS = 2500;   // stesso QR ignorato per 2.5s
const RESULT_AUTO_RESET_MS = 3000; // dopo 3s torna allo scanner

type Tone = "ok" | "warn" | "err";

const toneFor = (r: CheckinScanResult): Tone => {
  if (r.ok) return "ok";
  if (r.code === "already_used") return "warn";
  return "err";
};

const labelFor = (r: CheckinScanResult): string => {
  switch (r.code) {
    case "checked_in":        return "Check-in valido";
    case "already_used":      return "QR già utilizzato";
    case "not_found":         return "QR non valido";
    case "invalid_token":     return "QR non valido";
    case "event_cancelled":   return "Evento annullato";
    case "booking_cancelled": return "Prenotazione cancellata";
    case "event_missing":     return "Evento non trovato";
    case "forbidden":
    case "forbidden_event":   return "Non autorizzato";
    case "unauthorized":      return "Sessione scaduta";
    default:                  return r.message || "Errore";
  }
};

const vibrate = (p: number | number[]) => {
  try { (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.(p); }
  catch { /* noop */ }
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "—";

const AdminCheckinScan = () => {
  const [enabled, setEnabled] = useState(true);
  const [isProcessing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckinScanResult | null>(null);

  // anti doppia lettura: token + timestamp ultima scansione processata
  const lastRef = useRef<{ token: string; at: number } | null>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  const clearResetTimer = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  // Auto-reset del risultato e riabilitazione scanner
  const scheduleAutoResume = useCallback(() => {
    clearResetTimer();
    resetTimerRef.current = window.setTimeout(() => {
      setResult(null);
      processingRef.current = false;
      lastRef.current = null;
      resetTimerRef.current = null;
    }, RESULT_AUTO_RESET_MS);
  }, []);

  useEffect(() => () => clearResetTimer(), []);

  const handleScan = useCallback(async (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue?.trim();
    if (!raw) return;
    if (processingRef.current) return;

    const now = Date.now();
    if (lastRef.current
        && lastRef.current.token === raw
        && now - lastRef.current.at < COOLDOWN_MS) {
      return;
    }
    lastRef.current = { token: raw, at: now };
    processingRef.current = true;
    setProcessing(true);

    const res = await validateAndCheckInByQrToken(raw);
    setResult(res);
    setProcessing(false);

    vibrate(res.ok ? 120 : res.code === "already_used" ? [60, 60] : [60, 80, 60]);
    scheduleAutoResume();
  }, [scheduleAutoResume]);

  const scanAgain = () => {
    clearResetTimer();
    setResult(null);
    processingRef.current = false;
    lastRef.current = null;
    if (!enabled) setEnabled(true);
  };

  const togglePause = () => {
    clearResetTimer();
    setEnabled((v) => !v);
  };

  const tone = result ? toneFor(result) : null;

  return (
    <div className="container max-w-md mx-auto px-3 py-4 space-y-4 sm:max-w-2xl sm:py-8 sm:px-4">
      <AdminPageHeader
        title="Check-in QR"
        description="Inquadra il QR del partecipante: l'evento viene riconosciuto automaticamente."
      />

      {/* Area Scanner */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-black">
            {enabled ? (
              <Scanner
                onScan={handleScan}
                onError={() => { /* gestito dall'overlay */ }}
                constraints={{ facingMode: "environment" }}
                scanDelay={250}
                paused={isProcessing || !!result}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
                components={{ finder: true, torch: true }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <CameraOff className="h-10 w-10" />
                <p className="text-sm">Scanner in pausa</p>
              </div>
            )}

            {isProcessing && !result && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <RefreshCw className="h-12 w-12 text-white animate-spin" />
              </div>
            )}

            {result && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center backdrop-blur-sm ${
                  tone === "ok"   ? "bg-emerald-500/85"
                : tone === "warn" ? "bg-amber-500/85"
                                  : "bg-destructive/85"
                }`}
                role="status"
                aria-live="polite"
              >
                {tone === "ok"   ? <CheckCircle2 className="h-20 w-20 text-white" />
               : tone === "warn" ? <AlertTriangle className="h-20 w-20 text-white" />
                                 : <XCircle className="h-20 w-20 text-white" />}
                <p className="text-xl font-bold text-white">{labelFor(result)}</p>
                {result.profile?.full_name && (
                  <p className="text-sm text-white/95">{result.profile.full_name}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12"
              onClick={togglePause}
            >
              {enabled
                ? <><Pause className="h-4 w-4 mr-2" /> Pausa</>
                : <><Play className="h-4 w-4 mr-2" /> Riprendi</>}
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12"
              onClick={scanAgain}
              disabled={isProcessing}
            >
              <Camera className="h-4 w-4 mr-2" /> Scansiona altro QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card dettaglio risultato */}
      {result && (
        <Card
          className={
            tone === "ok"   ? "border-emerald-500/60"
          : tone === "warn" ? "border-amber-500/60"
                            : "border-destructive/60"
          }
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={tone === "ok" ? "default" : tone === "warn" ? "secondary" : "destructive"}
              >
                {labelFor(result)}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {fmtTime(result.checked_in_at ?? new Date().toISOString())}
              </span>
            </div>

            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className="col-span-1 text-muted-foreground">Utente</dt>
              <dd className="col-span-2 font-medium truncate">
                {result.profile?.full_name ?? result.profile?.email ?? "—"}
              </dd>

              <dt className="col-span-1 text-muted-foreground">Evento</dt>
              <dd className="col-span-2 font-medium truncate">
                {result.event?.title ?? "—"}
              </dd>

              <dt className="col-span-1 text-muted-foreground">Data evento</dt>
              <dd className="col-span-2">{fmtDate(result.event?.starts_at)}</dd>

              <dt className="col-span-1 text-muted-foreground">Stato precedente</dt>
              <dd className="col-span-2">
                <code className="text-xs">{result.previous_status ?? "—"}</code>
              </dd>

              <dt className="col-span-1 text-muted-foreground">Stato aggiornato</dt>
              <dd className="col-span-2">
                <code className="text-xs">
                  {result.new_status ?? result.booking?.status ?? "—"}
                </code>
              </dd>

              {result.booking?.reference_code && (
                <>
                  <dt className="col-span-1 text-muted-foreground">Codice</dt>
                  <dd className="col-span-2 font-mono text-xs">
                    {result.booking.reference_code}
                  </dd>
                </>
              )}
            </dl>

            {!result.ok && result.message && (
              <p className="text-xs text-muted-foreground">{result.message}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCheckinScan;
