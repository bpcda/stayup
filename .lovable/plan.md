## Contesto

Per rimuovere Appwrite senza rompere funzionalità (come richiesto) devo prima migrare a Supabase tutto ciò che è ancora su Appwrite. Lo schema v2 esistente **non basta**: copre `events / bookings / checkins / profiles / ...` ma non i concetti specifici di StayUp shuttle.

## Gap di schema da colmare

Lo schema Supabase v2 attuale **non** ha:

1. `shuttle_slots` — slot di andata (giorno, fermata, orario, capienza, price_override, nascosto, event_id)
2. `return_slots` — slot di ritorno (giorno, orario, capienza, price_override, nascosto, event_id)
3. `event_participations` — iscrizioni semplici a un evento (user_id, event_id, status)
4. Su `events`: campi `price_one_way`, `price_round_trip` (oggi su Appwrite), oltre a `cover_image_url` (già presente) usato come immagine principale.
5. `bookings` attuale Appwrite ha campi: `nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno, event_id, price_paid, pagato, reference_code`. La tabella `bookings` v2 in Supabase ha una forma diversa (event_id, user_id, status, qty, ...). → **da rivedere o sostituire** con una tabella `shuttle_bookings` dedicata.
6. Storage: bucket pubblico `event-images` (oggi Appwrite Bucket) per cover degli eventi caricate da admin.

## Nuove migration SQL da scrivere

`migrations/20260623_stayup_v2_shuttle.sql` (additiva):

- `shuttle_slots`, `return_slots`, `shuttle_bookings`, `event_participations`
- ALTER `events` ADD COLUMN `price_one_way_cents int`, `price_round_trip_cents int`
- Indici, trigger updated_at, RLS:
  - shuttle_slots / return_slots: read public, write admin
  - shuttle_bookings: insert anon+auth, read own (by email o user_id), admin all
  - event_participations: insert/delete self, read self + admin
- Bucket storage `event-images` (public read, admin write) — creato da snippet SQL `storage.buckets` + policy.

## Edge Functions da creare (sostituiscono Appwrite Functions)

1. `supabase/functions/create-booking/index.ts` — replica `appwrite/functions/create-booking`:
   - Valida payload con zod
   - Service role: verifica capienza slot andata/ritorno, "bump" all'orario disponibile più vicino se pieno
   - Insert in `shuttle_bookings` + genera `reference_code`
   - Chiama `send-email` (già esistente) per conferma
2. `supabase/functions/delete-account/index.ts` — replica `appwrite/functions/delete-account`:
   - Verifica JWT utente, `auth.admin.deleteUser(user_id)` via service role

## File applicativi da riscrivere (UI invariata)

| File | Cosa cambia |
|---|---|
| `src/hooks/useEventDetail.ts` | Query `events` + `event_participations` via Supabase; mantiene stessa firma |
| `src/hooks/useShuttleForm.ts` | Query `shuttle_slots`/`return_slots`/`shuttle_bookings`; submit via `supabase.functions.invoke('create-booking')` |
| `src/hooks/useAdminEvents.ts` | CRUD su `events` + upload cover su Supabase Storage `event-images` |
| `src/hooks/useAdminShuttleData.ts` | Lista `shuttle_bookings`, update `pagato`, invio email via `send-email` |
| `src/pages/admin/AdminShuttle.tsx` | CRUD `shuttle_slots`/`return_slots` |
| `src/pages/Profilo.tsx` | `supabase.auth.updateUser({ email })` + invoke `delete-account` |
| `src/interfaces/events.ts` | Adatta `EventRow` ai nomi colonna Supabase (rimuovo `$id`) |

## Pulizia finale (solo dopo che build passa con Supabase)

- `bun remove appwrite`
- Cancello: `src/lib/appwrite.ts`, `scripts/setup-appwrite.js`, `appwrite/` (intera cartella), eventuali tipi/interfaces residui
- `.env.example`: rimuovo sezione `VITE_APPWRITE_*` e `APPWRITE_API_KEY`
- Rimuovo commenti "Appwrite" residui nei file Supabase nuovi
- `tsgo --noEmit` deve passare
- Aggiorno `docs/MIGRATION_FOUNDATION.md` con stato "Appwrite removed"

## Vincoli rispettati

- UI invariata (nessuna modifica a componenti, layout, stile)
- Routing invariato
- Stesse firme degli hook esposti ai componenti
- Funzionalità preservate (shuttle booking, admin, profilo, dettaglio evento)

## Cose che ti chiedo di confermare prima di partire

1. **Secrets**: la Edge Function `create-booking` e `delete-account` richiedono `SUPABASE_SERVICE_ROLE_KEY` già configurato in Supabase Functions. La chiave Resend (`RESEND_API_KEY`) è già impostata per `send-email`. Confermi che le pubblicherai tu su Supabase / Vercel?
2. **Tabella `bookings` v2 esistente**: la lascio com'è e creo `shuttle_bookings` separata (meno invasivo), oppure preferisci che `bookings` v2 venga rinominata/sostituita? Consiglio **shuttle_bookings** dedicata.
3. **`event_participations`**: la pagina dettaglio evento oggi permette "Iscriviti" senza pagamento. Tabella separata da `bookings` (semplice RSVP)? Consiglio **sì**.
4. **Bucket storage**: nome `event-images` ok?

## Ordine di esecuzione proposto

```text
1. Migration SQL additiva (shuttle + participations + storage bucket)
2. Edge Functions create-booking + delete-account
3. Migra hook uno per volta (verificando tsgo dopo ciascuno):
   useEventDetail → useShuttleForm → useAdminEvents
   → useAdminShuttleData → AdminShuttle → Profilo
4. Rimuovi appwrite (deps + file + env + commenti)
5. Build check finale
```

Tempo stimato: lavoro denso, eseguito in più turni. Posso procedere step-by-step a partire dal punto 1 appena confermi i 4 punti sopra.
