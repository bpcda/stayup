# Role System Audit

Data: 2026-06-23. Ruoli: `user`, `organizer`, `admin` (enum `public.app_role`, tabella `public.user_roles`, funzione SECURITY DEFINER `public.has_role`).

## Stato per area

### 1. Frontend — route guards ✅ (con 1 fix applicato)
| Rotta | Guard | Note |
|---|---|---|
| `/profilo` | `UserGuard` (session richiesta) | ✅ |
| `/admin`, `/admin/eventi`, `/admin/eventi/:id/iscritti`, `/admin/prenotazioni`, `/admin/checkin` | `AdminGuard requireRole="organizer"` (admin OR organizer) | ✅ |
| `/admin/utenti`, `/admin/email-logs`, `/admin/impostazioni` | `AdminGuard requireRole="admin"` | ✅ rispetta la regola "solo admin" |
| `/admin/shuttle`, `/admin/eventi/:eventId/shuttle` | era `organizer` → **corretto a `admin`** | ⚠️ RLS `shuttle_slots`/`shuttle_return_slots` consente write **solo admin**: lasciare organizer creava UI rotta a runtime |
| `/auth`, `/reset-password`, `/eventi`, `/eventi/:slug` | pubbliche | ✅ |

`AdminGuard` redirige a `/auth` se non c'è sessione e mostra schermata "forbidden" se manca il ruolo. `UserGuard` redirige a `/auth` preservando `state.from`.

### 2. Menu admin ✅ (con 1 fix applicato)
`AdminSidebar` filtra le voci `adminOnly` controllando `isAdmin`. Voci `adminOnly`: Utenti, Email logs, Impostazioni, **Shuttle** (aggiunto per coerenza con la RLS).

### 3. `useAuth` ✅
- Listener `onAuthStateChange` registrato prima di `getSession()`.
- Ruoli risolti via `supabase.rpc("has_role", {...})` per `admin` e `organizer` → espone `isAdmin`, `isOrganizer`.
- `signOut` ripulisce stato locale.

### 4. Type system ⚠️ (corretto)
`src/types/supabase.ts` dichiarava `AppRole = "admin" | "moderator" | "user"`. Il DB ha `'admin' | 'organizer' | 'user'`. **Corretto** in: `"admin" | "organizer" | "user"`. Il client Supabase non è generico-tipato, quindi non c'erano errori a compile-time, ma il tipo era fuorviante.

### 5. RLS Supabase ✅
Verificata da `migrations/20260623_stayup_v2_schema.sql` + `_shuttle.sql` + `_site_settings_v2.sql`:

| Tabella | Policy chiave | Coerente con i requisiti? |
|---|---|---|
| `user_roles` | self read, admin all | ✅ solo admin assegna/revoca ruoli |
| `profiles` | self rw, admin all | ✅ |
| `events` | public read `status='published'`, organizer rw `organizer_id = auth.uid()`, admin all | ✅ |
| `bookings` | user own, organizer read eventi propri, admin all | ✅ |
| `checkins` | user read own, organizer rw eventi propri, admin all | ✅ |
| `event_categories` | public read, admin write | ✅ |
| `sponsors` | public read `is_active`, admin write | ✅ |
| `site_settings` | public read `is_public`, staff (admin+organizer) read tutti, **admin** insert/update/delete | ✅ scrittura solo admin |
| `email_logs` | admin all | ✅ |
| `newsletter_subscribers` | anon insert, user read own, admin all | ✅ |
| `consent_log` | self insert/read, admin read | ✅ |
| `shuttle_slots` / `shuttle_return_slots` | public read, admin write | ✅ — coperto anche lato UI con `adminOnly` |
| `shuttle_bookings` | anon/user insert, user read own, admin all | ✅ |
| `event_participations` | (tabella orfana, vedi report DB precedente) | n/a |

Funzione `has_role` è `security definer` con `set search_path = public` → evita RLS recursion e privilege escalation.

### 6. Edge functions / protezione API ✅
- `create-event-booking` (`verify_jwt = true`) valida con `supabase.auth.getUser()` e usa `auth.uid()` nella RPC `create_event_booking` (SECURITY DEFINER) → identità non falsificabile dal client.
- `delete-account` valida JWT in code via `getUser()`.
- `create-booking`, `send-booking-email` (`verify_jwt = false`): flusso shuttle pubblico; non eseguono operazioni admin.
- Nessuna edge function bypassa i ruoli: le scritture admin-only restano filtrate dalla RLS lato DB.

### 7. Redirect non autorizzati ✅
- Nessuna sessione → `/auth` (sia `UserGuard` sia `AdminGuard`).
- Sessione senza ruolo richiesto → schermata "forbidden" con pulsante `signOut` (no leak di rotte/dati).
- Cleanup ruoli a logout: `setIsAdmin(false)`, `setIsOrganizer(false)`.

## Modifiche applicate (minime, nessuna UI cambiata)
- `src/types/supabase.ts`: `AppRole` allineato all'enum DB.
- `src/App.tsx`: rotte `/admin/shuttle` e `/admin/eventi/:eventId/shuttle` marcate `adminOnly`.
- `src/components/admin/AdminSidebar.tsx`: voce "Shuttle" marcata `adminOnly`.

## Punti aperti (non bloccanti, fuori scope di questo task)
- `useAdminEvents` permette a un organizer di vedere la **lista completa** degli eventi (la RLS però blocca update/delete di eventi non propri → la mutation fallisce con errore RLS). UX migliorabile filtrando lato client `organizer_id = user.id` per i non-admin. Non tocca sicurezza.
- `useAdminOverview` esegue conteggi su `email_logs` anche per organizer: la RLS restituisce 0 senza errore, ma il KPI risulta a 0 → potrebbe essere nascosto ai non-admin.
- `AppRole = 'moderator'` in alcuni vecchi commenti/docs: non più referenziato nel codice attivo.

Sistema ruoli coerente con i requisiti.
