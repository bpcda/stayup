# MIGRATION_PLAN.md — Da Appwrite a Supabase

> Documento di analisi. Nessun file del progetto è stato modificato.
> Stato attuale: **doppio backend coesistente** — esistono già il client Supabase (`src/integrations/supabase/client.ts`), migrazioni SQL in `migrations/` e Edge Functions in `supabase/functions/`, ma l'app in runtime usa ancora prevalentemente Appwrite.

---

## 1. Dipendenze Appwrite installate

In `package.json`:

| Pacchetto | Versione | Dove è usato | Sostituto Supabase |
|---|---|---|---|
| `appwrite` | `^25.0.0` | SDK client browser (`src/lib/appwrite.ts` + hook/pagine) | `@supabase/supabase-js` (già installato) |
| `node-appwrite` | (in `appwrite/functions/*` e `scripts/setup-appwrite.js`) | SDK server per Functions e script setup | `@supabase/supabase-js` con `SERVICE_ROLE_KEY` lato Edge Function |

Azione: `bun remove appwrite node-appwrite` **solo al termine** della migrazione (vedi §Ordine).

---

## 2. File che importano / dipendono da Appwrite

### 2a. File da **MODIFICARE** (refactor verso Supabase)

| File | Ruolo Appwrite | Cosa cambiare |
|---|---|---|
| `src/lib/appwrite.ts` | Inizializza `Client`, `Account`, `Databases`, `Functions`, `Storage` | Eliminare dopo aver rimosso tutti gli import. Sostituito da `src/integrations/supabase/client.ts` (già esistente). |
| `src/interfaces/auth.ts` | `import { Models } from "appwrite"` per tipi user | Sostituire `Models.User<...>` con `User` da `@supabase/supabase-js` o tipo locale. |
| `src/lib/authMappers.ts` | Mappa `Models.User` → profilo app | Adattare al payload `User` di Supabase (`id`, `email`, `user_metadata`). |
| `src/hooks/useAuth.tsx` | `account.create / createEmailPasswordSession / get / deleteSession / updateName / updateEmail / updatePassword` | Migrare a `supabase.auth.signUp / signInWithPassword / getUser / signOut / updateUser`. Sostituire listener custom con `supabase.auth.onAuthStateChange`. |
| `src/hooks/useShuttleForm.ts` | `databases.listDocuments` su slots, `functions.createExecution("create-booking")` | Usare `supabase.from('shuttle_slots').select()`, `supabase.from('shuttle_return_slots').select()`, `supabase.functions.invoke('create-booking', { body })`. |
| `src/hooks/useAdminShuttleData.ts` | CRUD `databases.*` su `bookings`, `shuttle_slots`, `shuttle_return_slots` | Tradurre in chiamate `supabase.from(...).select/insert/update/delete()`. Sostituire `Query.equal/orderAsc/limit` con builder Supabase. |
| `src/hooks/useAdminEvents.ts` | CRUD su collection `events`, upload cover su bucket | Sostituire con `supabase.from('events')` e `supabase.storage.from('event-covers').upload()`. |
| `src/hooks/useEventDetail.ts` | `databases.getDocument` + `event_participations` | `supabase.from('events').select().eq('slug', ...).single()` + tabella `event_participations`. |
| `src/pages/admin/AdminShuttle.tsx` | Chiama `databases` direttamente per alcune azioni admin | Spostare le chiamate dirette al supabase client; mantenere la separazione esistente con gli hook. |
| `src/pages/Profilo.tsx` | `functions.createExecution("delete-account")`, update profilo | `supabase.functions.invoke('delete-account')` + `supabase.auth.updateUser` / `from('profiles').update`. |

### 2b. File da **ELIMINARE** (a migrazione completata)

| File / Cartella | Motivo |
|---|---|
| `src/lib/appwrite.ts` | Singleton client Appwrite — non più necessario. |
| `appwrite/functions/create-booking/` | Sostituita da `supabase/functions/create-booking/` (già presente). |
| `appwrite/functions/delete-account/` | Sostituita da `supabase/functions/delete-account/` (già presente). |
| `appwrite/functions/send-booking-email/` | Sostituita da `supabase/functions/send-booking-email/` (già presente). |
| Cartella radice `appwrite/` | Vuota dopo le rimozioni sopra. |
| `scripts/setup-appwrite.js` | Script idempotente per creare DB/collection/bucket su Appwrite — sostituito dalle migrazioni SQL in `migrations/`. |
| Variabili `VITE_APPWRITE_*` e `APPWRITE_API_KEY` in `.env.example` | Sostituite da `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. |

### 2c. File **NON** da toccare (sono già Supabase-only)

- `src/integrations/supabase/client.ts`
- `supabase/functions/create-booking/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/send-booking-email/index.ts`
- `migrations/*.sql`

---

## 3. Servizi Appwrite utilizzati → equivalente Supabase

| Servizio Appwrite | Uso nel progetto | Equivalente Supabase |
|---|---|---|
| **Account** (auth email/password) | Login, signup, sessione, update profilo, change email/password | **Supabase Auth** (`supabase.auth`) — email/password attivo di default. |
| **Databases** (collections: `bookings`, `shuttle_slots`, `shuttle_return_slots`, `events`, `event_participations`) | CRUD lettura/scrittura da client e da Functions | **Postgres** via PostgREST (`supabase.from('<table>')`). Tabelle equivalenti già create dalle migrazioni esistenti. |
| **Query** (`Query.equal`, `orderAsc`, `limit`, ecc.) | Filtri lato client | Query builder Supabase (`.eq`, `.order`, `.limit`, `.in`, `.gte`). |
| **Storage** (bucket `event-covers`) | Upload immagini copertina eventi | **Supabase Storage** (`supabase.storage.from('event-covers')`). Bucket previsto in `20260424_site_settings_and_storage.sql`. |
| **Functions** (`create-booking`, `delete-account`, `send-booking-email`) | Logica server con API key | **Supabase Edge Functions** (Deno) — già esistenti in `supabase/functions/`. Invocate via `supabase.functions.invoke('<name>', { body })`. |
| **Permissions** (per-document/collection) | Controllo accessi | **Row Level Security** + policies (`has_role`, `auth.uid()`). Pattern già presente nelle migrazioni. |
| **Realtime** | **NON utilizzato** nel progetto (nessun `client.subscribe(...)` rilevato) | N/A — se servisse, `supabase.channel(...).on('postgres_changes', ...)`. |
| **Middleware / Hooks server** | Non presenti come middleware dedicati; logica inline nelle Functions | Edge Function + RLS. |

---

## 4. Autenticazione — dettaglio

Mappatura chiamate (in `src/hooks/useAuth.tsx`):

| Appwrite | Supabase |
|---|---|
| `account.create(ID.unique(), email, password, name)` | `supabase.auth.signUp({ email, password, options: { data: { name } } })` |
| `account.createEmailPasswordSession(email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
| `account.get()` | `supabase.auth.getUser()` / sessione da `onAuthStateChange` |
| `account.deleteSession('current')` | `supabase.auth.signOut()` |
| `account.updateName(name)` | `supabase.auth.updateUser({ data: { name } })` |
| `account.updateEmail(email, password)` | `supabase.auth.updateUser({ email })` (richiede conferma via email) |
| `account.updatePassword(new, old)` | `supabase.auth.updateUser({ password: new })` |
| Account deletion via Function | Edge Function con `service_role` che chiama `admin.deleteUser(userId)`. |

Profilo applicativo: già coperto dalla migrazione `20260424_profiles_autocreate.sql` (trigger `on_auth_user_created` → `public.profiles`).

---

## 5. Database — mapping collection → tabella

Tutte queste tabelle esistono già nelle migrazioni Supabase (`migrations/*.sql`). Verificare allineamento di campi/tipi con quanto in `scripts/setup-appwrite.js`:

| Appwrite collection | Tabella Postgres | Note migrazione |
|---|---|---|
| `bookings` | `public.bookings` | Verificare campi: `nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno, stato, pagato, event_id, price_paid, created_at`. |
| `shuttle_slots` | `public.shuttle_slots` | Campi: `giorno, fermata, orario, capienza, trip_group_id, nascosto, event_id, price_override`. |
| `shuttle_return_slots` | `public.shuttle_return_slots` | Campi: `giorno, orario, capienza, nascosto, event_id, price_override`. |
| `events` | `public.events` | Allineata già da `20260424_events_align_frontend.sql`. |
| `event_participations` | `public.event_participations` | `event_id, user_id, status`. |

**ID**: passare da stringhe Appwrite (`$id`) a `uuid` Postgres. Tutti i riferimenti `event_id`/`user_id` lato client devono usare il nuovo tipo. Le proprietà speciali `$id, $createdAt, $updatedAt` non esistono più — sostituire con `id, created_at, updated_at`.

**GRANT + RLS**: per ogni tabella public usata dal client serve `GRANT` esplicito + policy RLS (vedi §Rischi). Controllare che ciascuna migrazione contenga `GRANT SELECT/INSERT/UPDATE/DELETE` ai ruoli corretti.

---

## 6. Storage

- Bucket Appwrite `event-covers` → Bucket Supabase `event-covers` (creato in `20260424_site_settings_and_storage.sql`).
- Upload: `supabase.storage.from('event-covers').upload(path, file)`.
- URL pubblico: `supabase.storage.from('event-covers').getPublicUrl(path)`.
- Policy: configurare l'accesso pubblico in lettura e scrittura limitata agli admin (via `storage.objects` policies).

---

## 7. Funzioni server (Edge Functions)

Le tre Edge Functions Supabase esistono già. Da verificare prima del cutover:

| Function | Cosa controllare |
|---|---|
| `supabase/functions/create-booking/index.ts` | Logica di allocazione slot/return-slot, validazione input (Zod), capienza, CORS, retorno booking. Confrontare con `appwrite/functions/create-booking/src/main.js` per parità funzionale. |
| `supabase/functions/delete-account/index.ts` | Validazione JWT in-code, uso `service_role` per `admin.deleteUser`, eliminazione righe collegate (profiles, bookings, participations) o on-delete cascade nello schema. |
| `supabase/functions/send-booking-email/index.ts` | Provider email (Resend o altro), variabili `RESEND_API_KEY`/equivalente, template, CORS. |

Invocazione dal client: ovunque ci sia `functions.createExecution("<id>", JSON.stringify(payload))` → diventa `supabase.functions.invoke('<name>', { body: payload })`.

---

## 8. Realtime

Non utilizzato (nessun `client.subscribe`, nessun listener realtime). Nessuna azione richiesta.

---

## 9. Middleware

Non esistono middleware applicativi (no SSR, no Next middleware). La guardia admin è `src/components/AdminGuard.tsx` ed è basata su hook auth: dopo la migrazione dovrà leggere il ruolo da `public.user_roles` via `has_role(auth.uid(), 'admin')` (pattern già imposto dalle linee guida progetto), **non** da metadati lato client.

---

## 10. Environment variables

**Da rimuovere (Appwrite):**
```
VITE_APPWRITE_ENDPOINT
VITE_APPWRITE_PROJECT
VITE_APPWRITE_DATABASE_ID
VITE_APPWRITE_COLLECTION_BOOKINGS
VITE_APPWRITE_COLLECTION_SHUTTLE_SLOTS
VITE_APPWRITE_COLLECTION_RETURN_SLOTS
VITE_APPWRITE_COLLECTION_EVENTS
VITE_APPWRITE_BUCKET_EVENTS
VITE_APPWRITE_COLLECTION_EVENT_PARTICIPATIONS
VITE_APPWRITE_FUNCTION_CREATE_BOOKING
VITE_APPWRITE_FUNCTION_DELETE_ACCOUNT
VITE_APPWRITE_FUNCTION_SEND_BOOKING_EMAIL
APPWRITE_API_KEY
```

**Da mantenere / aggiungere (Supabase / Cloud):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID
# lato Edge Functions (gestite come "secrets", non in .env committato):
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY        # se send-booking-email usa Resend
```

Nota: i secret server-side vanno aggiunti via il tool `add_secret`, non committati.

---

## 11. Componenti UI che dipendono dal backend

Componenti/pagine che cambiano comportamento (ma di solito **non** la struttura JSX) quando si migra il backend:

- `src/components/ShuttleForm.tsx` — consuma `useShuttleForm`. Nessun cambio UI atteso se l'hook mantiene la stessa API.
- `src/components/AdminGuard.tsx` — passa da check Appwrite a check Supabase + `has_role`.
- `src/components/admin/shuttle/*` (`BookingsTable`, `ShuttleAndataManager`, `ShuttleRitornoManager`, `ShuttleModals`, `ShuttleFilters`, `ShuttleStats`) — consumano `useAdminShuttleData`. Adeguare solo se cambiano i nomi di campo (`$id`→`id`).
- `src/components/admin/events/*` (`EventsTable`, `EventModals`) — idem via `useAdminEvents`.
- `src/components/event-detail/*` — via `useEventDetail`.
- `src/components/profilo/MyEvents.tsx` — query partecipazioni.
- `src/pages/Auth.tsx`, `src/pages/Profilo.tsx`, `src/pages/admin/*` — pagine che leggono direttamente lo stato auth o invocano Functions.

Strategia: **isolare il cambio dietro gli hook** (`useAuth`, `useShuttleForm`, `useAdminShuttleData`, `useAdminEvents`, `useEventDetail`) per minimizzare l'impatto sui componenti UI.

---

## Rischi della migrazione

1. **ID format**: passaggio da stringa Appwrite a `uuid`. Qualunque dato esistente in Appwrite va re-importato con nuovi UUID + tabella di mapping per non rompere FK.
2. **Permessi**: Appwrite usa permission per documento; Supabase usa RLS + GRANT. Ogni tabella nuova *deve* avere sia `GRANT` espliciti sia policy RLS, altrimenti errore 401/permission denied a runtime.
3. **Ruoli admin**: vietato salvare il ruolo sul profilo (rischio escalation). Usare tabella `user_roles` + funzione `has_role` security-definer (vedi linee guida progetto).
4. **Sessione utente**: cambia il formato del token e l'evento di refresh. Tutti i posti che leggono "user" devono passare dall'hook unificato per evitare flicker/loop di redirect.
5. **Email/conferma**: `auth.updateUser({ email })` richiede conferma via email — comportamento diverso rispetto ad Appwrite (che richiede password). Adeguare la UI.
6. **Edge Functions vs Appwrite Functions**: differenze di header (`x-appwrite-user-id` → JWT da validare in-code), di CORS (richiesto esplicitamente), di runtime (Deno vs Node). Verificare che le tre Functions Supabase abbiano già CORS + validazione JWT + input validation con Zod.
7. **Storage**: URL pubblico cambia dominio → vecchi link salvati in DB (`cover_image_url`) vanno aggiornati post-import.
8. **Migrazione dati**: serve uno script una-tantum che legga da Appwrite e scriva su Postgres rispettando l'ordine FK (events → shuttle_slots/return_slots → bookings/participations; profili creati da trigger `on_auth_user_created`). Gli utenti vanno re-invitati o importati con `admin.createUser` (hash password Appwrite non riutilizzabile).
9. **Down-time**: con doppio backend già esistente è possibile un cutover atomico (flip degli hook + redeploy) ma richiede freeze scritture su Appwrite durante il dump.
10. **`scripts/setup-appwrite.js`** non è equivalente alle migrazioni: cross-check dei campi (es. lunghezze `String(255)` vs `text`, default valori, nullabilità) per evitare drift di schema.
11. **`AdminGuard` durante il refactor**: se la verifica del ruolo cambia mentre la UI è ancora parzialmente Appwrite, gli admin potrebbero perdere accesso. Mantenere doppia verifica temporanea o fare il refactor auth in un'unica PR.
12. **Cache `@tanstack/react-query`**: le key di cache attuali potrebbero contenere id-string Appwrite. Invalidate globale al primo deploy post-migrazione.

---

## Ordine corretto delle attività

Fasi sequenziali. Ogni fase è verificabile prima di passare alla successiva.

### Fase 0 — Preparazione (no code)
1. Abilitare Lovable Cloud (Supabase) se non già attivo e verificare le variabili `VITE_SUPABASE_*`.
2. Audit migrazioni: confrontare schema `migrations/*.sql` con `scripts/setup-appwrite.js` e produrre una migrazione delta se mancano colonne (`price_paid`, `price_override`, `trip_group_id`, `nascosto`, ecc.).
3. Aggiungere GRANT mancanti e policy RLS per ogni tabella public.
4. Aggiungere tabella `user_roles` + funzione `has_role` (se non presenti).

### Fase 1 — Backend pronto
5. Verificare/aggiornare le tre Edge Functions Supabase (CORS, JWT, Zod, parità con quelle Appwrite).
6. Configurare bucket `event-covers` con policy lettura pubblica.
7. Registrare i secret server-side necessari (`RESEND_API_KEY`, ecc.) via `add_secret`.

### Fase 2 — Migrazione dati (script una-tantum, non committare nel runtime)
8. Esportare da Appwrite (events, slots, return_slots, bookings, participations, utenti).
9. Importare su Postgres preservando relazioni e generando mapping id-vecchio → uuid-nuovo.
10. Aggiornare `cover_image_url` con i nuovi URL Storage.
11. Re-creare utenti via `admin.createUser` (con flag invite o password temporanea + reset).

### Fase 3 — Refactor client (in più PR isolate)
12. `src/interfaces/auth.ts` + `src/lib/authMappers.ts` (tipi).
13. `src/hooks/useAuth.tsx` — auth completa su Supabase + `AdminGuard` su `has_role`.
14. `src/hooks/useShuttleForm.ts` (lettura slot + invoke `create-booking`).
15. `src/hooks/useAdminShuttleData.ts` (CRUD admin shuttle).
16. `src/hooks/useAdminEvents.ts` (CRUD eventi + upload cover).
17. `src/hooks/useEventDetail.ts` + `src/components/profilo/MyEvents.tsx` (partecipazioni).
18. `src/pages/Profilo.tsx`, `src/pages/admin/AdminShuttle.tsx` e ogni altro consumatore residuo.

### Fase 4 — Pulizia
19. Rimuovere `src/lib/appwrite.ts`.
20. Rimuovere cartella `appwrite/` e `scripts/setup-appwrite.js`.
21. Aggiornare `.env.example` (togliere VITE_APPWRITE_*, lasciare solo VITE_SUPABASE_*).
22. `bun remove appwrite node-appwrite`.
23. Verifica finale: `rg -i appwrite .` deve restituire 0 risultati (eccetto eventuali changelog).

### Fase 5 — Validazione
24. Test E2E dei flussi critici: signup/login/logout, prenotazione navetta (andata, ritorno, A/R con auto-return), creazione/modifica evento con cover, area admin (lista prenotazioni, sposta/elimina, invio mail), eliminazione account.
25. Smoke test policy RLS: utente non-admin non deve leggere dati altrui; admin sì.
26. Monitor log Edge Functions per 24-48h.

---

## Riepilogo molto sintetico

- **2 dipendenze** da rimuovere (`appwrite`, `node-appwrite`).
- **~10 file TS/TSX** da refactorare (concentrati negli hook + 2-3 pagine).
- **~5 file/cartelle** da eliminare (`src/lib/appwrite.ts`, `appwrite/`, `scripts/setup-appwrite.js`, env Appwrite).
- **Backend Supabase è già scaffoldato**: migrazioni + 3 Edge Functions presenti. Il lavoro pesante è il refactor degli hook e la migrazione dati una-tantum.
- **Realtime e middleware**: nessun lavoro richiesto.
