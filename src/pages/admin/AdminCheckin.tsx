import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronUp, List, QrCode } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminCheckins } from "@/hooks/useAdminCheckins";
import { QrScannerPanel } from "@/components/admin/checkin/QrScannerPanel";

const AdminCheckin = () => {
  const [eventId, setEventId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scannerOn, setScannerOn] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { events, todayList, loading, error, checkIn, checkInByToken } = useAdminCheckins(eventId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await checkIn(query)) setQuery("");
  };

  return (
    <div className="container max-w-md mx-auto px-3 py-4 space-y-4 sm:max-w-2xl sm:py-8 sm:px-4">
      <AdminPageHeader title="Check-in" description="Scansiona il QR o cerca per codice / email." />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <Select value={eventId ?? ""} onValueChange={(v) => { setEventId(v || null); setScannerOn(false); }}>
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Seleziona evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {eventId && (
        <>
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-4 w-4 text-primary" /> Scansione QR
                <Badge variant="outline" className="ml-auto">{todayList.length} fatti</Badge>
              </div>
              <QrScannerPanel
                enabled={scannerOn}
                onToggle={setScannerOn}
                onScan={checkInByToken}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <form onSubmit={submit} className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Ricerca manuale (codice o email)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Es. AB12CD34 o email@dominio"
                    className="h-12 text-base"
                    inputMode="search"
                    autoCapitalize="characters"
                  />
                  <Button type="submit" size="lg" className="h-12 shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive px-1">{error}</p>}

          <Card>
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              className="w-full flex items-center justify-between p-3 sm:p-4 text-left"
              aria-expanded={listOpen}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <List className="h-4 w-4" /> Ultimi check-in ({todayList.length})
              </span>
              {listOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {listOpen && (
              <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
                {loading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Caricamento…</p>
                ) : todayList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nessun check-in.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {todayList.map((c) => (
                      <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name ?? c.email ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {c.reference_code ?? c.booking_id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant={c.method === "qr" ? "default" : "secondary"} className="text-[10px]">
                            {c.method}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {new Date(c.checked_in_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminCheckin;
