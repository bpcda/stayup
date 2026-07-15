import { useCallback, useEffect, useRef, useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import {
  Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Pause, Play, Keyboard, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  validateAndCheckInByQrToken,
  type CheckinScanResult,
} from "@/services/supabase/checkin.service";

/**
 * /admin/checkin/scan
 *
 * Scanner QR resiliente:
 *  - probe permessi camera con messaggi dedicati (denied / no device / busy /
 *    unsupported / loading);
 *  - fallback manuale "inserisci QR token" che usa lo stesso backend
 *    (checkin_by_qr_token), nessun bypass di ruolo / doppio uso / validazione;
 *  - scanner continuo con cooldown anti doppia lettura e auto-resume.
 */

const COOLDOWN_MS = 2500;          // stesso QR ignorato per 2.5s
const RESULT_AUTO_RESET_MS = 3000; // dopo 3s torna allo scanner

type Tone = "ok" | "warn" | "err";

type CamState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "denied" }
  | { kind: "no_device" }
  | { kind: "busy" }
  | { kind: "unsupported" }
  | { kind: "error"; message: string };

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

/**
 * Mappa l'errore di getUserMedia in uno stato applicativo.
 * Vedi: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia#exceptions
 */
const mapCameraError = (err: unknown): CamState => {
  const name = (err as { name?: string })?.name ?? "";
  const message = (err as { message?: string })?.message ?? "Errore fotocamera";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return { kind: "denied" };
    case "NotFoundError":
    case "OverconstrainedError":
    case "DevicesNotFoundError":
      return { kind: "no_device" };
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return { kind: "busy" };
    case "SecurityError":
      return { kind: "error", message: "Accesso fotocamera bloccato (richiede HTTPS)." };
    default:
      return { kind: "error", message };
  }
};

const probeCamera = async (): Promise<CamState> => {
  if (typeof navigator === "undefined"
      || !navigator.mediaDevices
      || typeof navigator.mediaDevices.getUserMedia !== "function") {
    return { kind: "unsupported" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    // Rilascia subito: il componente Scanner aprirà il suo stream.
    stream.getTracks().forEach((t) => t.stop());
    return { kind: "ready" };
  } catch (err) {
    return mapCameraError(err);
  }
};

const AdminCheckinScan = () => {
  const [enabled, setEnabled] = useState(true);
  const [isProcessing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckinScanResult | null>(null);
  const [cam, setCam] = useState<CamState>({ kind: "loading" });
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

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

  const runProbe = useCallback(async () => {
    setCam({ kind: "loading" });
    const s = await probeCamera();
    setCam(s);
  }, []);

  useEffect(() => {
    void runProbe();
    return () => clearResetTimer();
  }, [runProbe]);

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

  const processToken = useCallback(async (raw: string) => {
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

  const handleScan = useCallback(async (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue?.trim();
    if (raw) await processToken(raw);
  }, [processToken]);

  const handleScannerError = useCallback((err: unknown) => {
    setCam(mapCameraError(err));
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    setManualSubmitting(true);
    // Forza il reset del cooldown per consentire reinvio manuale.
    lastRef.current = null;
    processingRef.current = false;
    await processToken(token);
    setManualSubmitting(false);
    setManualToken("");
  };

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
  const cameraReady = cam.kind === "ready";

  return (
    <div className="mx-auto max-w-md space-y-3 sm:max-w-2xl sm:py-4">
      <div className="hidden sm:block">
        <AdminPageHeader
          title="Scanner Check-in"
          description="Inquadra il QR del partecipante: l'evento viene riconosciuto automaticamente."
        />
      </div>
      <header className="flex items-center justify-between px-1 py-1 sm:hidden">
        <div>
          <h1 className="text-lg font-semibold text-white">Scanner Check-in</h1>
          <p className="text-xs text-[#8A8A8A]">Inquadra il QR del biglietto</p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">QR</Badge>
      </header>

      {/* Area Scanner */}
      <Card className="overflow-hidden rounded-lg border-white/10 bg-[#101010]">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-black sm:aspect-square">
            {cameraReady && enabled ? (
              <Scanner
                onScan={handleScan}
                onError={handleScannerError}
                constraints={{ facingMode: "environment" }}
                scanDelay={250}
                paused={isProcessing || !!result}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
                components={{ finder: true, torch: true }}
              />
            ) : cameraReady && !enabled ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <CameraOff className="h-10 w-10" />
                <p className="text-sm">Scanner in pausa</p>
              </div>
            ) : (
              <CameraOverlay state={cam} onRetry={runProbe} onManual={() => setManualOpen(true)} />
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

            {cameraReady && !result && (
              <div className="pointer-events-none absolute inset-x-8 top-8 bottom-8 rounded-lg border-2 border-white/80">
                <span className="absolute -left-0.5 -top-0.5 h-8 w-8 border-l-4 border-t-4 border-white" />
                <span className="absolute -right-0.5 -top-0.5 h-8 w-8 border-r-4 border-t-4 border-white" />
                <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 border-b-4 border-l-4 border-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 border-b-4 border-r-4 border-white" />
                <span className="absolute left-0 right-0 top-1/2 h-px bg-primary shadow-[0_0_16px_rgba(255,159,0,0.9)]" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 border-white/10 bg-white/[0.03]"
              onClick={togglePause}
              disabled={!cameraReady}
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
              disabled={isProcessing || !cameraReady}
            >
              <Camera className="h-4 w-4 mr-2" /> Altro QR
            </Button>
          </div>

          {/* Fallback manuale: sempre disponibile, anche senza camera */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-primary transition-colors"
              onClick={() => setManualOpen((v) => !v)}
              aria-expanded={manualOpen}
            >
              <Keyboard className="h-4 w-4" />
              Inserisci QR token manualmente
            </button>
            {manualOpen && (
              <form className="mt-3 space-y-2" onSubmit={handleManualSubmit}>
                <Label htmlFor="manual-token" className="text-xs text-muted-foreground">
                  Incolla o digita il token presente nel QR.
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-token"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="es. 8f3a…"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                    maxLength={256}
                  />
                  <Button
                    type="submit"
                    disabled={!manualToken.trim() || manualSubmitting}
                  >
                    {manualSubmitting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : "Verifica"}
                  </Button>
                </div>
              </form>
            )}
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

/**
 * Overlay mostrato quando lo Scanner non può essere montato.
 * Stati: loading | denied | no_device | busy | unsupported | error
 */
const CameraOverlay = ({
  state,
  onRetry,
  onManual,
}: {
  state: CamState;
  onRetry: () => void;
  onManual: () => void;
}) => {
  if (state.kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white gap-3 px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm">Avvio fotocamera…</p>
      </div>
    );
  }

  const ui = (() => {
    switch (state.kind) {
      case "denied":
        return {
          icon: <CameraOff className="h-10 w-10" />,
          title: "Permesso fotocamera negato",
          desc: "Per scansionare i QR devi autorizzare l'accesso alla fotocamera. Apri le impostazioni del sito nel browser, abilita la fotocamera per questo dominio e riprova.",
        };
      case "no_device":
        return {
          icon: <CameraOff className="h-10 w-10" />,
          title: "Nessuna fotocamera disponibile",
          desc: "Non è stata trovata una fotocamera utilizzabile. Usa un dispositivo dotato di fotocamera (es. smartphone) oppure inserisci il token manualmente.",
        };
      case "busy":
        return {
          icon: <AlertTriangle className="h-10 w-10" />,
          title: "Fotocamera occupata",
          desc: "La fotocamera è in uso da un'altra app o tab. Chiudi le altre app/tab che la usano e riprova.",
        };
      case "unsupported":
        return {
          icon: <AlertTriangle className="h-10 w-10" />,
          title: "Browser non supportato",
          desc: "Questo browser non espone l'API fotocamera. Apri la pagina in Safari (iOS), Chrome o Firefox aggiornato, oppure usa l'inserimento manuale.",
        };
      case "error":
      default:
        return {
          icon: <AlertTriangle className="h-10 w-10" />,
          title: "Errore fotocamera",
          desc: state.kind === "error" ? state.message : "Errore sconosciuto.",
        };
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center h-full text-white gap-3 px-6 text-center">
      {ui.icon}
      <p className="text-base font-semibold">{ui.title}</p>
      <p className="text-xs text-white/80 leading-relaxed">{ui.desc}</p>
      <div className="flex flex-wrap gap-2 justify-center pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" /> Riprova
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onManual}>
          <Keyboard className="h-4 w-4 mr-2" /> Inserisci manualmente
        </Button>
      </div>
    </div>
  );
};

export default AdminCheckinScan;
