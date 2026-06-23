# DATABASE CONSISTENCY REPORT

Data: 2026-06-23
Scopo: confronto fra **schema reale** (migrations applicate in `migrations/*.sql`), **tipi TypeScript** (`src/types/supabase.ts`) e **query/codice** (`src/**`).
Nessuna modifica applicata: solo audit + proposta migrazioni minime.

---

## Legenda

- ✅ coerente
- ⚠️ incoerente / da correggere
- ❌ rotto a runtime (colonna/tabella mancante o nome sbagliato)
- 🗑️ obsoleto (residuo Appwrite / pre-v2)

---

## 1. `profiles` ❌ (root cause di più errori)

### Colonne reali (DB)
Da `20260623_stayup_v2_schema.sql` + `20260623_consent_management.sql`:

```
id, email (citext), full_name, phone, avatar_url, birthdate, city,
marketing_opt_in (bool),
privacy_accepted_at, privacy_version,
marketing_consent (bool), marketing_consent_at,
created_at, updated_at
```

### Colonne usate dal codice
| Colonna | File | Stato |
|---|---|---|
| `id, email, full_name, phone, city, created_at` | `useAdminUsers.ts`, `useAdminBookings.ts`, `useAdminCheckins.ts` | ✅ |
| `avatar_url, birthdate, marketing_opt_in` | nessuno | ⚠️ presenti in DB, mai usate (non bloccante) |
| **`first_name`, `last_name`** | `useProfile.ts:8,9,19,45,46`, `useAuth.tsx:121,122`, `Profilo.tsx:50-52,66,67`, `AdminEventoIscritti.tsx:93,107,108` | ❌ **NON esistono in DB** |
| `privacy_accepted_at, privacy_version, marketing_consent, marketing_consent_at` | `useProfile.ts`, `Profilo.tsx` | ✅ |

### Tipi TypeScript (`src/types/supabase.ts:29-48`)
Dichiarano `id, email, full_name, phone, created_at, updated_at` ⚠️ — mancano tutte le colonne consent + `avatar_url, birthdate, city, marketing_opt_in`.

### Diagnosi
La migrazione legacy `20260424_profiles_autocreate.sql` inseriva `first_name, last_name, phone, city` ma non crea quelle colonne. La tabella v2 (`stayup_v2_schema.sql`) crea solo `full_name`. La trigger v2 + consent overrida correttamente a `full_name`. **Il codice non è stato aggiornato dal modello legacy (Appwrite/v1) al v2.**

### Query rotte
- `useProfile.load()` → `select("id, first_name, last_name, ...")` → errore 42703 (`column profiles.first_name does not exist`).
- `Profilo.handleSave()` → `update({ first_name, last_name, ... })` → stessa cosa.
- `AdminEventoIscritti` riga 93 → `select("id, first_name, last_name, phone, email")` → stessa cosa.
- `useAuth.signUp` mette `first_name`/`last_name` nel `raw_user_meta_data` ma il trigger v2 legge solo `full_name` → dati persi.

---

## 2. `events` ✅ (con leggere ridondanze)

### Schema reale
Da v2 base + `stayup_v2_shuttle` + `events_editor_extras`:
```
id, slug, title, description, short_description, cover_image_url,
location, venue, category_id, organizer_id,
starts_at, ends_at, capacity, price_cents, currency,
status (enum: draft|published|cancelled|archived|ended),
published_at, gallery_urls (text[]), sponsor_ids (uuid[]),
is_active, is_public, has_shuttle, price_one_way, price_round_trip,
created_at, updated_at
```

### Codice ↔ DB
Tutte le colonne usate (`useAdminEvents`, `Eventi.tsx`, `useEventDetail`, `useShuttleForm`) esistono. ✅

### Tipi TS (`supabase.ts:59-82`)
Mancano: `venue, category_id, organizer_id, capacity, price_cents, currency, status, published_at, short_description, gallery_urls, sponsor_ids`. ⚠️ Solo problema di tipizzazione (codice usa `as unknown as EventRow`), nessun errore a runtime.

### Note 🗑️
- I campi `is_active, is_public, has_shuttle, price_one_way, price_round_trip` sono legacy Appwrite ma ancora referenziati da admin (`useAdminEvents`) e overview (`useAdminOverview`). Tenerli finché l'admin UI non viene ricostruito.

---

## 3. `bookings` ✅

### Schema reale (v2 + `bookings_qr_and_rpc`)
```
id, event_id, user_id, status (enum), quantity, total_cents, currency,
notes, reference_code, qr_token,
booked_at, cancelled_at, created_at, updated_at
```

### Codice
- `useEventDetail`, `useAdminBookings`, `useAdminOverview`, `useAdminCheckins`, `MyEvents`, `AdminEventoIscritti`: usano `id, event_id, user_id, status, reference_code, qr_token, booked_at, cancelled_at, quantity, total_cents, currency, notes, created_at`. ✅
- Vincolo `unique(event_id, user_id)` rispettato dall'RPC `create_event_booking`.

### Tipi TS (`supabase.ts:123-152`) ⚠️
Dichiarano modello legacy Appwrite (`nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno, pagato, price_paid, stato`). **Non corrisponde alla tabella `bookings` v2** — corrisponde invece a `shuttle_bookings`. Confusione di tipi. Codice non legge questi tipi (usa `from('bookings')` direttamente), quindi nessun crash, ma type-safety persa.

---

## 4. `checkins` ✅ (tipi mancanti)

### Schema reale
```
id, booking_id (unique), event_id, user_id, checked_in_at, checked_in_by,
method, notes, created_at
```

### Codice
`useAdminCheckins`, `useAdminOverview`, `useAdminUsers`, `AdminEventoIscritti`, `AdminCheckin`: usano colonne corrette. ✅

### Tipi TS ⚠️
`checkins` **non è dichiarata** in `src/types/supabase.ts`.

---

## 5. `site_settings` ⚠️ (dual-schema)

### Schema reale
La migration v1 (`20260424_site_settings_and_storage.sql`) crea PK = `key text`, `value text`. La v2 (`20260623_site_settings_v2.sql`) **droppa** la tabella v1 e crea: `id uuid PK, key text unique, value jsonb, description, is_public, created_at, updated_at`.

### Codice
- `useSiteSettings.ts:18` → `select("key, value")` su `value jsonb`. ✅ funziona, ma il JSON viene letto come oggetto, non come string.
- `AdminImpostazioni.tsx:30,52` → `select("key, value, description")` + `upsert({ key, value }, { onConflict:"key" })`. ✅ a livello schema. Il valore viene salvato; se l'UI manda string, JSONB accetta strighe quotate.

### Tipi TS ❌
`site_settings` **non è dichiarata** in `src/types/supabase.ts`.

---

## 6. `email_logs` ✅ (tipi mancanti)

### Schema reale
```
id, to_email, from_email, subject, template, status (enum),
provider_id, error_message,
related_user_id, related_event_id, related_booking_id,
payload (jsonb), sent_at, created_at
```

### Codice
`useAdminEmailLogs.ts:38,59`, `useAdminOverview.ts:68,69`. Usa `id, template, status, created_at`. ✅

### Tipi TS ❌
Non dichiarata in `supabase.ts`.

---

## 7. `campaigns` ⚠️/🗑️

### Schema reale
**Nessuna tabella `campaigns`** in nessuna migration.

### Codice
Nessun riferimento (`rg campaigns src` → 0). ✅ né rotta né definita.

Conclusione: voce dell'inventario senza impatto. Se servirà newsletter campaigns, creare migrazione dedicata.

---

## 8. `newsletter_subscribers` ⚠️

### Schema reale (v2 base)
```
id, email, status (enum: pending|confirmed|unsubscribed),
source, user_id, confirmation_token,
confirmed_at, unsubscribed_at, created_at, updated_at
```

### Codice
**Nessun riferimento in `src/`** (`rg newsletter src` → 0). ✅ tabella presente, non ancora usata dal frontend.

### Tipi TS ❌
Non dichiarata.

---

## 9. `event_categories` ✅ (tipi mancanti)

### Schema
`id, slug, name, description, color, icon, sort_order, created_at, updated_at`.

### Codice
- `Eventi.tsx:72` → `select("id, slug, name")` + join via `events.event_categories(slug,name)`. ✅
- `useAdminEvents.ts:81`, `useAdminUsers.ts:70`. ✅

### Tipi TS ❌
Non dichiarata.

---

## 10. `event_participations` 🗑️ (root cause originale)

### Schema reale
Esiste (creata in `20260623_stayup_v2_shuttle.sql`) con: `id, event_id, user_id, status, created_at`. **Non ha mai avuto `attended`/`attended_at`.**

### Codice
- **Zero riferimenti in `src/`** (grep negativo). ✅
- **Presente nei tipi TS** (`supabase.ts:153-169`). ⚠️ tipo orfano.

### Errore "`column event_participations.attended does not exist`"
Causa probabile **non in codice frontend** (il src è pulito). Possibili origini residue:
1. **Cached schema PostgREST**: una richiesta vecchia ancora in retry/queue.
2. **Edge Function** lato server (non in `src/`) che fa ancora reference.
3. **DB object** (VIEW / FUNCTION / TRIGGER) creato manualmente o da una migration cancellata.

Verifica suggerita (eseguire su DB):
```sql
select n.nspname, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%event_participations.attended%';

select schemaname, viewname from pg_views
where definition ilike '%event_participations.attended%';

select tgname, tgrelid::regclass from pg_trigger
where pg_get_triggerdef(oid) ilike '%attended%';
```

---

## Riepilogo errori bloccanti

| # | Severità | Tabella | Sintesi |
|---|---|---|---|
| A | 🔴 alta | `profiles` | Codice select/update `first_name, last_name` su tabella che ha solo `full_name`. Rompe `useProfile`, `Profilo`, `AdminEventoIscritti`, signup. |
| B | 🟡 media | `src/types/supabase.ts` | Tipi disallineati: manca `checkins, site_settings, email_logs, newsletter_subscribers, event_categories, sponsors, user_interests, consent_log`. `bookings` definita con schema shuttle errato. `event_participations` ancora dichiarata. `profiles` priva di campi consent. |
| C | 🟡 media | `event_participations` | Tabella esiste ma non più usata. Errore runtime `attended` arriva da fonte non-`src/` (edge function o oggetto DB). |
| D | 🟢 bassa | `events` | Tipi TS incompleti (campi v2 mancanti); nessun crash. |
| E | 🟢 bassa | Inventario | `campaigns` non esiste e non è usata. |

---

## Migrazioni minime proposte

Obiettivo: **risolvere A senza inventare colonne** e **chiudere C**.

### Opzione consigliata per (A): aggiornare il **codice**, non lo schema

Il modello v2 ha intenzionalmente solo `full_name`. Aggiungere colonne `first_name`/`last_name` sarebbe regressione. Quindi:

- Refactor `useProfile.ts`, `Profilo.tsx`, `useAuth.signUp`, `AdminEventoIscritti.tsx` per usare `full_name` (split/parse opzionale solo nell'UI).
- Nessuna migration SQL necessaria per A.

Se invece si preferisce **mantenere il form a due campi** lato UI senza toccarlo:

```sql
-- migrations/20260624_profiles_legacy_name_columns.sql
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- backfill da full_name (split sul primo spazio)
update public.profiles
   set first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
       last_name  = coalesce(last_name,  nullif(regexp_replace(full_name, '^\S+\s*', ''), ''))
 where full_name is not null
   and (first_name is null or last_name is null);

-- mantieni full_name in sync via trigger
create or replace function public.profiles_sync_full_name()
returns trigger language plpgsql as $$
begin
  if (new.full_name is null or new.full_name = '')
     and (new.first_name is not null or new.last_name is not null) then
    new.full_name := trim(coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,''));
  end if;
  return new;
end$$;

drop trigger if exists trg_profiles_sync_full_name on public.profiles;
create trigger trg_profiles_sync_full_name
  before insert or update on public.profiles
  for each row execute function public.profiles_sync_full_name();
```

### Per (C): drop tabella obsoleta `event_participations`

Solo dopo aver confermato che nessuna edge function la usa:

```sql
-- migrations/20260624_drop_event_participations.sql
do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='event_participations') then
    drop table public.event_participations cascade;
  end if;
end$$;
```

Questo elimina anche eventuali viste/policy dipendenti (cascade) e fa **sparire l'errore `column does not exist`** nel caso provenga da un oggetto orfano che la referenzia.

### Per (B): rigenerare `src/types/supabase.ts`

Non è una migration SQL ma un'azione necessaria:

```
supabase gen types typescript --project-id <ref> --schema public > src/types/supabase.ts
```

In alternativa, riscrittura manuale del file allineata alle migrations correnti.

---

## Raccomandazione finale

1. **Prima**: applicare la migration di drop `event_participations` (C) → conferma se l'errore sparisce. Se sparisce, era un oggetto DB orfano.
2. **Poi**: decidere se rifattorizzare il codice profilo (consigliato) o aggiungere le colonne legacy (`first_name/last_name`) come migration di compatibilità (A).
3. **Infine**: rigenerare tipi TS (B) per riallineare type-safety.

Nessuna feature aggiunta, nessuna UI modificata.
