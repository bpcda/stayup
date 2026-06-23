## Dashboard amministrativa StayUp

Estende l'area `/admin` esistente trasformandola in una dashboard completa con shell condivisa (sidebar + header), accesso ristretto a `admin` e `organizer`, e sette sezioni operative tutte su Supabase.

### Accesso

- Estendo `AdminGuard` per accettare ruoli `admin` **o** `organizer` (oggi solo `admin`). Aggiungo `isOrganizer` in `useAuth` via `has_role` RPC. Le sezioni sensibili (Utenti, Email logs, Impostazioni) restano solo-`admin` tramite un check inline.
- Nessuna nuova migration: le tabelle (`bookings`, `checkins`, `email_logs`, `profiles`, `user_roles`, `events`) e le policy admin esistono già in `20260623_stayup_v2_schema.sql`.

### Shell `/admin/*`

Nuovo `AdminLayout` con `SidebarProvider` shadcn:

```text
[Sidebar]                 [Header: SidebarTrigger + user]
 Overview      /admin
 Eventi        /admin/eventi
 Prenotazioni  /admin/prenotazioni     (nuovo)
 Check-in      /admin/checkin          (nuovo)
 Utenti        /admin/utenti           (nuovo, solo admin)
 Email logs    /admin/email-logs       (nuovo, solo admin)
 Shuttle       /admin/shuttle
 Impostazioni  /admin/impostazioni     (solo admin)
```

Design coerente con StayUp: token semantici (`bg-background`, `text-primary`, `border-border`), card shadcn, niente colori hardcoded. La vecchia `AdminHome` a griglia di card viene sostituita dall'**Overview KPI**.

### Sezioni

**1. Overview (`/admin`)** — `AdminOverview.tsx`
KPI cards: utenti totali, eventi attivi, eventi futuri, prenotazioni confermate (30gg), check-in oggi, email inviate (7gg), tasso bounce. Lista "Prossimi 5 eventi" + "Ultime 10 prenotazioni". Tutto via Supabase queries con `count: 'exact', head: true`.

**2. Gestione eventi (`/admin/eventi`)** — esistente, integrata nella nuova shell. Nessuna modifica funzionale.

**3. Creazione/modifica eventi** — già coperta da `EventModals` esistente.

**4. Gestione prenotazioni (`/admin/prenotazioni`)** — `AdminPrenotazioni.tsx`
Tabella `bookings` con filtri per evento, status (`pending|confirmed|cancelled|refunded`), ricerca per email/nome. Azioni: conferma, cancella, refund (update `status`). Export CSV. Detail drawer con dati pagamento e profilo.

**5. Gestione utenti (`/admin/utenti`)** — `AdminUtenti.tsx`, solo admin
Lista `profiles` con join lato client su `user_roles`. Ricerca per email/nome. Azioni: promuovi a `organizer`/`admin`, revoca ruolo (insert/delete su `user_roles`). Mostra numero prenotazioni per utente.

**6. Check-in (`/admin/checkin`)** — `AdminCheckin.tsx`
Selettore evento + ricerca prenotazione per `reference_code` o email. Bottone "Check-in" che fa insert in `checkins` (con `event_id`, `booking_id`, `user_id`, `checked_in_by = auth.uid()`). Lista live dei check-in del giorno con counter. Predisposto per futuro scanner QR (input testuale che accetta anche `reference_code` da QR).

**7. Email logs (`/admin/email-logs`)** — `AdminEmailLogs.tsx`, solo admin
Tabella `email_logs` con: filtri time range (24h/7gg/30gg/custom), template, status (sent/failed/bounced/complained), summary cards (totale, sent, failed, bounced), paginazione 50/pagina, badge colorati per status. Dettaglio: `error_message`, payload metadata.

### File

**Nuovi**
- `src/components/admin/AdminLayout.tsx` — shell SidebarProvider + Outlet
- `src/components/admin/AdminSidebar.tsx` — voci con `NavLink`, badge ruolo
- `src/pages/admin/AdminOverview.tsx` (rimpiazza AdminHome come `/admin`)
- `src/pages/admin/AdminPrenotazioni.tsx`
- `src/pages/admin/AdminUtenti.tsx`
- `src/pages/admin/AdminCheckin.tsx`
- `src/pages/admin/AdminEmailLogs.tsx`
- `src/hooks/useAdminOverview.ts`, `useAdminBookings.ts`, `useAdminUsers.ts`, `useAdminCheckins.ts`, `useAdminEmailLogs.ts`

**Modificati**
- `src/App.tsx` — nuove rotte sotto `<AdminGuard><AdminLayout/>` con `<Outlet/>`
- `src/components/AdminGuard.tsx` — accetta `requireRole?: 'admin' | 'organizer'` (default `organizer`)
- `src/hooks/useAuth.tsx` — aggiunge `isOrganizer`
- `src/pages/admin/AdminHome.tsx` — eliminato (sostituito da Overview)

### Note tecniche

- Le query usano `supabase.from(...).select(..., { count: 'exact' })` con paginazione `range()`.
- Email logs deduplica per `message_id` come da knowledge base.
- Nessuna modifica a `bookings`/`checkins`/`email_logs` schema: tutto compatibile con policy esistenti (`admin all`, `organizer read`).
- Nessuna emoji, nessun colore hardcoded, niente nuove dipendenze.
