# Database Consistency Report — Fase 2

Data: 2026-06-24
Scope: audit schema Supabase ↔ tipi TypeScript ↔ servizi/query del frontend.

Sorgenti incrociate:
- `migrations/*.sql` (StayUp v2 base + estensioni)
- `src/types/supabase.ts`
- `src/services/supabase/*.ts`, `src/lib/supabase/*.ts`
- tutti gli `.from(...)` / `.rpc(...)` in `src/**`

---

## 1. Tabelle presenti nel DB (migrations)

| Tabella | Migration che la crea | Note |
|---|---|---|
| `user_roles` | `20260623_stayup_v2_schema.sql` | enum `app_role` (admin/organizer/user) |
| `profiles` | `20260623_stayup_v2_schema.sql` + `20260623_consent_management.sql` | full_name + colonne consent |
| `event_categories` | `20260623_stayup_v2_schema.sql` | — |
| `events` | `20260623_stayup_v2_schema.sql` + `20260623_events_editor_extras.sql` + `20260623_stayup_v2_shuttle.sql` | v2 + extra editor + campi legacy shuttle |
| `bookings` | `20260623_stayup_v2_schema.sql` + `20260623_bookings_qr_and_rpc.sql` | event bookings v2 + `qr_token` |
| `checkins` | `20260623_stayup_v2_schema.sql` | — |
| `email_logs` | `20260623_stayup_v2_schema.sql` | enum `email_status` |
| `newsletter_subscribers` | `20260623_stayup_v2_schema.sql` | — |
| `sponsors` | `20260623_stayup_v2_schema.sql` | — |
| `user_interests` | `20260623_stayup_v2_schema.sql` | — |
| `site_settings` | `20260623_site_settings_v2.sql` | sostituisce v1 (key/value text) con (id, key, value jsonb, is_public) |
| `consent_log` | `20260623_consent_management.sql` | — |
| `shuttle_slots` | `20260623_stayup_v2_shuttle.sql` | legacy shuttle |
| `shuttle_return_slots` | `20260623_stayup_v2_shuttle.sql` | legacy shuttle |
| `shuttle_bookings` | `20260623_stayup_v2_shuttle.sql` | prenotazioni navetta (≠ bookings) |
| `event_participations` | `20260623_stayup_v2_shuttle.sql` | RSVP |

Funzioni: `public.has_role(uuid, app_role)`, `public.create_event_booking(uuid)`,
`public.handle_new_user()`, `public.set_updated_at()`, `public.update_updated_at_column()`.

Storage bucket: `event-covers` (creato in `20260424_site_settings_and_storage.sql`),
`event-images` (creato in `20260623_stayup_v2_shuttle.sql`).

---

## 2. Tabelle usate dal codice (`src/**`)

Estratte da `rg -o "\.from\(['\"][a-z_]+"`:

```
bookings, checkins, consent_log, email_logs, event_categories, events,
profiles, shuttle_bookings, shuttle_return_slots, shuttle_slots,
site_settings, sponsors, user_roles
```

RPC chiamate: `has_role`.

> `create_event_booking` esiste come RPC server-side ma il frontend la invoca
> tramite Edge Function `create-event-booking` (vedi `bookings.service.ts` /
> `supabase/functions`), non direttamente: nessun mismatch.

Tabelle **non usate** dal frontend (presenti nel DB):
- `user_interests` — feature non ancora wired.
- `event_participations` — orfana lato UI. Vedi §5.
- `newsletter_subscribers` — referenziata solo da Edge Functions.

---

## 3. Stato tipi TypeScript (`src/types/supabase.ts`) prima dell'audit

| Tabella | Tipizzata? | Allineata allo schema reale? |
|---|---|---|
| `user_roles` | sì | ✅ |
| `profiles` | sì | ❌ mancavano `avatar_url`, `birthdate`, `city`, `marketing_opt_in`, e tutte le colonne consent (`privacy_*`, `marketing_consent*`) |
| `event_categories` | **no** | — |
| `events` | sì | ❌ tipo basato sul layout legacy (Appwrite-like). Mancavano `price_cents`, `currency`, `status`, `category_id`, `organizer_id`, `capacity`, `venue`, `published_at`, `short_description`, `gallery_urls`, `sponsor_ids`. Colonne legacy `is_active/is_public/has_shuttle/price_one_way/price_round_trip` corrette ma incomplete. |
| `bookings` | sì | ❌ tipo del **vecchio** flusso shuttle (nome/email/telefono/tipo_viaggio…). La tabella reale è event-booking v2 (event_id+user_id NOT NULL, status enum, quantity, total_cents, reference_code, qr_token). |
| `checkins` | **no** | — |
| `email_logs` | **no** | — |
| `newsletter_subscribers` | **no** | — |
| `sponsors` | **no** | — |
| `user_interests` | **no** | — |
| `site_settings` | **no** | — |
| `consent_log` | **no** | — |
| `shuttle_slots` | sì | ⚠ manca `updated_at` |
| `shuttle_return_slots` | sì | ⚠ manca `updated_at` |
| `shuttle_bookings` | **no** | — |
| `event_participations` | sì | nominale (status testuale), ok |

Enums tipizzati prima dell'audit: `app_role` (corretto post-fix Fase 1),
`trip_type`, `booking_status`. **Mancavano**: `event_status`, `email_status`,
`newsletter_status`, `sponsor_tier`. Inoltre `booking_status` mancava il
valore `refunded`.

---

## 4. Servizi e query — incompatibilità

### 4.1 `src/services/supabase/shuttle.service.ts`

Le funzioni `listBookings / updateBooking / deleteBooking` usano
`supabase.from("bookings")` con `TablesUpdate<"bookings">`, ma con lo schema
v2 reale `public.bookings` **non contiene** `nome/email/telefono/giorno/
fermata/tipo_viaggio/stato/pagato`. Quelle colonne vivono in
`public.shuttle_bookings`.

→ **Bug logico**: il service è ancora puntato alla tabella sbagliata.
Il modulo dichiara «not yet wired into the UI», quindi non rompe nulla a
runtime, ma se collegato genera errori PostgREST 400/404 sulle colonne.

Fix consigliato (non incluso in questo PR per non toccare logica oltre
l'allineamento tipi): rinominare quelle 3 funzioni a `*ShuttleBooking` e
puntare a `.from("shuttle_bookings")`. Tracciato qui per follow-up.

### 4.2 `src/integrations/supabase/client.ts`

Crea il client **non tipizzato** (`SupabaseClient` senza `<Database>`). I tipi
generati in `src/types/supabase.ts` non vengono quindi applicati alle query
fatte tramite questo client. Tutto il codice UI esistente usa questo client.
Il client tipato (`src/lib/supabase/client.ts → supabaseBrowser`) esiste ma è
usato solo dai due `services/`.

→ Non è un mismatch di schema, è una **mancata adozione** del tipo.
Migrazione progressiva consigliata: importare `supabaseBrowser` al posto di
`supabase` file-by-file. Nessun impatto runtime.

### 4.3 Query frontend

Sweep su tutti gli `.from(...).select(...)` non ha rivelato riferimenti a
colonne inesistenti (post-fix Fase 1: rimozione di `event_participations.attended`
e dei riferimenti a `first_name/last_name`). L'unico residuo strutturale è
quello del §4.1.

---

## 5. Tabelle/colonne potenzialmente obsolete

| Oggetto | Stato | Azione consigliata |
|---|---|---|
| `events.is_active`, `is_public`, `has_shuttle`, `price_one_way`, `price_round_trip` | Legacy "Appwrite-like", convivono con i campi v2 (`status`, `price_cents`). Usati dagli hook admin esistenti. | Mantenere finché l'admin non migra completamente ai campi v2; nessuna DROP. |
| `event_participations` | Tabella creata nello shuttle migration. Nessun riferimento in `src/**`. | Lasciare in DB (FK su events ok). Valutare DROP in una fase futura se rimane non usata. |
| `site_settings` v1 (key text PK) | Sostituita dalla v2 con colonna `id` (`20260623_site_settings_v2.sql` esegue DROP CASCADE se rileva lo schema vecchio). | Nessuna azione, già gestita. |
| `bookings.qr_token` e RPC `create_event_booking` | Schema definitivo (Fase 1). | Mantenere. |

Nessuna **colonna obsoleta** ancora referenziata in modo errato dal codice.

---

## 6. Differenze Appwrite → Supabase

Eredità del vecchio backend Appwrite ancora visibili:
- Naming italiano sulle colonne shuttle (`giorno`, `fermata`, `orario`,
  `nascosto`, `pagato`, `stato`). Mantenuto per compatibilità con le UI esistenti.
- Campi `events.is_active / is_public / has_shuttle / price_one_way /
  price_round_trip` (vedi sopra).
- Tipo `bookings` lato TS modellava ancora il payload Appwrite — risolto.

Nessuna chiamata residua a SDK Appwrite (`node_appwrite`, `appwrite`,
`databases.listDocuments`, ecc.) — verificato con `rg`.

---

## 7. Azioni eseguite in questo PR

1. **Riscritto `src/types/supabase.ts`** completo, basato su tutte le
   migrations attualmente in `migrations/`. Aggiunte tutte le tabelle e gli
   enum mancanti; corretto il tipo `bookings`; aggiornato `profiles` con i
   campi consent.
2. Aggiunte le RPC `has_role` e `create_event_booking` nel blocco `Functions`.
3. Esportato il nuovo helper `Enums<T>`.
4. **Eliminate** le definizioni manuali approssimative (vecchio `bookings`
   shuttle-like, `BookingStatus` parziale, `TripType` come enum PG). Sostituite
   con definizioni 1:1 al DB.

Niente modifiche a UI, autenticazione, routing, RLS o dati.

---

## 8. Migration SQL necessarie

**Nessuna nuova migration richiesta** per allineare lo schema: le migrations
esistenti sotto `migrations/` descrivono già lo stato definitivo. I tipi
TypeScript sono stati allineati a quello stato.

Follow-up opzionali (non eseguiti, da decidere con il prodotto):
- `migrations/<data>_shuttle_service_rename.sql`: nessuna SQL necessaria;
  serve solo refactor TS (`shuttle.service.ts` → puntare a `shuttle_bookings`).
- `migrations/<data>_drop_event_participations.sql`: solo se si conferma che
  la feature RSVP non verrà riusata.
- Adozione globale di `supabaseBrowser` (tipato) al posto del client legacy in
  `src/integrations/supabase/client.ts`. Refactor incrementale, fuori scope.

---

## 9. Comando per rigenerare i tipi dal DB live

```sh
supabase gen types typescript \
  --project-id <PROJECT_REF> \
  --schema public \
  > src/types/supabase.ts
```

Eseguirlo dopo ogni nuova migration e committare il diff: sostituirà la
versione hand-curated mantenendo la stessa shape (`Database`, `Tables<>`,
`TablesInsert<>`, `TablesUpdate<>`).
