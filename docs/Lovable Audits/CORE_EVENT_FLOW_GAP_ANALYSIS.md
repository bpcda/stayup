# CORE EVENT FLOW — Gap Analysis

> Documento di chiusura del **Core Event Flow** StayUp.
> Scope: solo ciò che serve al percorso
> _Registrazione → Login → Vedi evento → Prenota → QR → Profilo → Check-in → Storico_.
> CRM, newsletter, marketing, analytics avanzate e nuove integrazioni esterne sono **fuori scope**.

Data audit: 2026-06-24

---

## 1. Funzionalità mancanti (rispetto al flusso target)

| # | Funzionalità | Stato | Note |
|---|---|---|---|
| 1 | Storico partecipazioni nel profilo (`/profilo` → "I miei eventi") | **Mancante** | `MyEvents.tsx` non fa alcun join con `public.checkins`; per gli eventi passati non c'è alcun indicatore "Partecipato / Assente". È l'unico vero blocker del flusso richiesto. |

Tutti gli altri step del flusso sono già coperti dal codice esistente (vedi §5).

---

## 2. Funzionalità incomplete (utili al flusso, non bloccanti)

| # | Funzionalità | Stato | Note |
|---|---|---|---|
| 1 | Separazione Prossimi / Passati in MyEvents | Parziale | Tutti i booking sono in un unico elenco ordinato per `booked_at DESC`. Per il flusso "Storico" è utile distinguere `starts_at` futuro/passato. |
| 2 | Badge visivo "Sold out" su card e dettaglio evento | Parziale | Il backend impedisce correttamente la doppia prenotazione (RPC `create_event_booking` con lock + `raise 'sold_out'`), ma il frontend lo segnala solo via toast al click. Non blocca il rilascio. |

---

## 3. Funzionalità fuori dal flusso target (NON da implementare ora)

Lasciate consapevolmente fuori dall'attuale fase, in linea con la consegna:

- CRUD admin di **categorie** e **sponsor** (oggi gestibili solo via SQL/Studio).
- **Welcome email** post-registrazione (template `registration-confirmation` esiste in `supabase/functions/_shared/emails.ts` ma non è invocato da `Auth.tsx`).
- **Email "evento annullato"** agli iscritti (template inesistente, nessun trigger su `events.status = 'cancelled'`).
- **Reminder evento schedulato** (template `event-reminder` pronto, ma nessun cron / pg_cron / scheduled function).
- Pagina admin per invii email ad-hoc.

Tutte queste sono utili in produzione ma **non bloccano il Core Event Flow** richiesto.

---

## 4. Dipendenze tecniche

Tutto già presente nel progetto:

- Supabase (`@supabase/supabase-js`) — auth, DB, RPC, edge functions, RLS.
- Resend via edge function `create-event-booking` (email con QR già inviata alla prenotazione).
- `@yudiel/react-qr-scanner` per lo scan operatore.
- `qrserver.com` (img pubblica) per il rendering QR nel profilo utente.
- Migration già applicate:
  - `20260623_stayup_v2_schema.sql` (schema base: profiles, events, bookings, checkins, ...).
  - `20260623_bookings_qr_and_rpc.sql` (`qr_token`, RPC `create_event_booking`).
  - `20260624_enable_pgcrypto_and_fix_rpc.sql` (fix `gen_random_bytes` → `gen_random_uuid`).
  - `20260624_checkin_by_qr_rpc.sql` (RPC `checkin_by_qr_token`, idempotente, role-gated).

Nessuna nuova dipendenza npm o nuova migration SQL necessaria per chiudere il flusso (l'RLS `checkins user read own` è già attiva — il client può leggere i propri checkin).

---

## 5. Stato attuale del flusso richiesto

| Step | Implementazione | Stato |
|---|---|---|
| Registrazione | `src/pages/Auth.tsx` + Supabase Auth | ✅ |
| Login (email/password + Google) | `src/pages/Auth.tsx`, `useAuth` | ✅ |
| Visualizza evento (lista + dettaglio) | `src/pages/Eventi.tsx`, `src/pages/EventoDettaglio.tsx` | ✅ |
| Prenota evento | `useEventDetail.ts` → edge function `create-event-booking` → RPC | ✅ |
| Riceve QR via email | `supabase/functions/create-event-booking/index.ts` (Resend inline + QR img) | ✅ |
| Visualizza QR nel profilo | `src/components/profilo/MyEvents.tsx` (dialog con QR) | ✅ |
| Check-in tramite scanner | `src/pages/admin/AdminCheckin.tsx`, `src/pages/admin/AdminCheckinScan.tsx`, RPC `checkin_by_qr_token` | ✅ |
| Storico partecipazione | Non collegato in `MyEvents.tsx` | ❌ → **da chiudere in Fase 3** |

---

## 6. Blocchi che impediscono il rilascio in produzione (rispetto al flusso target)

Bloccante:
1. **Storico partecipazione assente** — l'utente non vede se ha partecipato a un evento passato. Va aggiunto join con `public.checkins` lato profilo.

Non bloccanti ma raccomandati prima del go-live "real users":
- Configurare le **redirect URL** OAuth Google in Supabase Dashboard (preview + dominio finale).
- Verificare che la migration `20260624_checkin_by_qr_rpc.sql` sia applicata sull'istanza Supabase di produzione.
- Verificare i secret `RESEND_API_KEY` / `RESEND_FROM_EMAIL` su Edge Functions di produzione.
- Confermare politica privacy / consenso marketing per gli utenti reali (già presente in `consent_management`).
