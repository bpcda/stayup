import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useShuttleForm, DAYS, STOPS, TIPO_VALUES, timeToMinutes } from "@/hooks/useShuttleForm";
import { TipoViaggio } from "@/interfaces/shuttle";

interface ShuttleFormProps {
  onSuccess: () => void;
  eventId?: string;
}

const ShuttleForm = ({ onSuccess, eventId }: ShuttleFormProps) => {
  const { t } = useTranslation();
  const form = useShuttleForm(onSuccess, eventId);

  const tipoLabels: Record<TipoViaggio, string> = {
    andata: t("form.tripOnewayOut"),
    ritorno: t("form.tripOnewayBack"),
    andata_ritorno: t("form.tripRound"),
  };

  return (
    <form onSubmit={form.handleSubmit} className="space-y-5">
      {/* Personal data */}
      <div className="space-y-2">
        <Label htmlFor="nome">{t("form.name")} *</Label>
        <Input id="nome" value={form.nome} onChange={(e) => form.setNome(e.target.value)} placeholder={t("form.namePlaceholder")} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("form.email")} *</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => form.setEmail(e.target.value)} placeholder={t("form.emailPlaceholder")} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">{t("form.phone")} *</Label>
        <Input id="telefono" type="tel" value={form.telefono} onChange={(e) => form.setTelefono(e.target.value)} placeholder={t("form.phonePlaceholder")} required />
      </div>

      {/* Trip type */}
      <div className="space-y-2">
        <Label>{t("form.tripType")} *</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_VALUES.map((value) => (
            <button key={value} type="button" onClick={() => form.setTipoViaggio(value)}
              className={`px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                form.tipoViaggio === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}>
              {tipoLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {/* Andata fields */}
      {form.needsAndata && (
        <>
          <div className="space-y-2">
            <Label>{t("form.departureDay")} *</Label>
            <div className="grid grid-cols-2 gap-3">
              {DAYS.map((d) => (
                <button key={d} type="button" onClick={() => form.setGiorno(d)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    form.giorno === d ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("form.stop")} *</Label>
            <div className="grid grid-cols-2 gap-3">
              {STOPS.map((s) => (
                <button key={s} type="button" onClick={() => form.setFermata(s)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    form.fermata === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {form.giorno && form.fermata && (
            <div className="space-y-2">
              <Label>{t("form.departureTime")} *</Label>
              {form.loadingSchedules ? (
                <p className="text-muted-foreground text-sm">{t("form.loadingTimes")}</p>
              ) : form.slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("form.noTimes")}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {form.slots.map((s) => (
                    <button key={s.id} type="button" onClick={() => form.setOrario(s.orario)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        form.orario === s.orario ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                      }`}>
                      {s.orario}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Giorno selector for solo ritorno */}
      {form.needsRitorno && !form.needsAndata && (
        <div className="space-y-2">
          <Label>{t("form.returnDay")} *</Label>
          <div className="grid grid-cols-2 gap-3">
            {DAYS.map((d) => (
              <button key={d} type="button" onClick={() => form.setGiorno(d)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.giorno === d ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ritorno time selection */}
      {form.needsRitorno && form.giorno && (
        <div className="space-y-2">
          <Label>{t("form.returnTime")} *</Label>
          {form.loadingReturnSlots ? (
            <p className="text-muted-foreground text-sm">{t("form.loadingTimes")}</p>
          ) : form.returnSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("form.noReturnTimes")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {form.returnSlots.map((rs) => {
                const disabled = form.needsAndata && form.orario ? timeToMinutes(rs.orario) <= timeToMinutes(form.orario) : false;
                return (
                  <button key={rs.id} type="button" disabled={disabled} onClick={() => form.setOrarioRitorno(rs.orario)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      disabled ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : form.orarioRitorno === rs.orario ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                    }`}>
                    {rs.orario}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Acceptance checkboxes */}
      {form.tipoViaggio && (
        <div className="space-y-3 pt-2 border-t border-border mt-2">
          <p className="text-sm font-medium text-foreground pt-2">{t("form.beforeBooking")}</p>

          <div className="flex items-start space-x-3">
            <Checkbox id="pagamento" checked={form.accettaPagamento} onCheckedChange={(c) => form.setAccettaPagamento(c === true)} className="mt-0.5" />
            <label htmlFor="pagamento" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              <Trans i18nKey="form.consentPayment" components={{ strong: <strong className="text-foreground" /> }} />
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox id="rimborso" checked={form.accettaRimborso} onCheckedChange={(c) => form.setAccettaRimborso(c === true)} className="mt-0.5" />
            <label htmlFor="rimborso" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              {t("form.consentRefund")}
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox id="termini" checked={form.accettaTermini} onCheckedChange={(c) => form.setAccettaTermini(c === true)} className="mt-0.5" />
            <label htmlFor="termini" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              <Trans i18nKey="form.consentTerms" components={{
                  termsLink: <Link to="/termini" target="_blank" className="text-primary underline hover:text-primary/80" />,
                  privacyLink: <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80" />,
                }} />
            </label>
          </div>
        </div>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={form.loading || !form.accettaTermini || !form.accettaPagamento || !form.accettaRimborso}>
        {form.loading ? t("form.submitting") : (
          <div className="flex justify-between items-center w-full px-2">
            <span>{t("form.submitBtn")}</span>
            {form.totalPrice > 0 && <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">€ {form.totalPrice.toFixed(2)}</span>}
          </div>
        )}
      </Button>
    </form>
  );
};

export default ShuttleForm;
