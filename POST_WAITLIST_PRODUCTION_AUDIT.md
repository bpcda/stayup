# POST-WAITLIST PRODUCTION AUDIT — StayUp

Data: 2026-06-27 (post implementazione waitlist automatica)
Scope: Booking · Waitlist · QR · Check-in · Email · Admin · Organizer · RLS · Edge Functions · Storage

Legenda severità:
- 🔴 **CRITICO** — blocca go-live o causa perdita dati / privilege escalation
- 🟠 **ALTO** — produce regressioni visibili agli utenti reali
- 🟡 **MEDIO** — degrada UX o copertura casi limite
- 🟢 **BASSO** — polish / hardening incrementale

---

## Sintesi

| Severità  | Conteggio |
|-----------|-----------|
| CRITICO   | 2 |
| ALTO      | 6 |
| MEDIO     | 9 |
| BASSO     | 6 |

Verdetto: **production-acceptable con riserva** — risolvere i 2 CRITICI prima dell'apertura al pubblico; gli ALTI sono da chiudere nei primi 7 giorni dopo lancio. Il core flow (booking → QR → check-in → waitlist auto-promotion) è funzionalmente solido.

---

## 🔴 CRITICO

### C1 — Trigger DB di auto-promotion non invia l'email
**Area:** Waitlist · Edge Functions
**File:** `migrations/20260627_waitlist_auto_promote.sql` (trigger `bookings_waitlist_auto_promote`), `supabase/functions/process-waitlist-outbox/index.ts`

Il trigger DB promuove correttamente (status → `offered`, token + scadenza) ma **non** può chiamare l'edge function `send-email`. L'email viene inviata solo:
- dall'edge function `cancel-event-booking` (best-effort sincrono), oppure
- dal worker `process-waitlist-outbox` (richiede schedule esterno: pg_cron+pg_net o Supabase Scheduled Functions).

**Casi di silent fail (utente promosso ma nessuna email):**
- admin cancella un booking dal pannello (`AdminPrenotazioni`) con UPDATE diretto → trigger promuove, ma `cancel-event-booking` non viene invocata.
- booking eliminato via SQL/dashboard.
- `cancel-event-booking` chiamata ma `send-email` fallisce: la riga ha `offer_email_sent_at = NULL` e resta in attesa del worker.
- **Schedule del worker non confermato in `supabase/config.toml`** — se la schedule non è attiva in produzione, gli utenti restano `offered` con la finestra che scade senza notifica → no-show automatico.

**Azione:** verificare/attivare lo schedule (Supabase Scheduled Functions o `cron + pg_net`) per `process-waitlist-outbox` ogni 1–2 minuti; aggiungere alert se `count(waitlist where status='offered' and offer_email_sent_at is null and offered_at < now()-interval '5 min') > 0`.

### C2 — `accept_waitlist_offer` può creare booking duplicato e violare la capienza tra `count(*)` e `INSERT`
**Area:** Waitlist · RLS / RPC
**File:** `migrations/20260626_waitlist.sql` (funzione `accept_waitlist_offer`)

Tra il `select count(*)` e la `insert` su `bookings` non c'è `lock` sull'evento (al contrario di `create_event_booking` che fa `select ... for update` su `events`). Sotto carico:
- N utenti hanno ancora un `offer_token` valido (es. evento con cancellazioni multiple ravvicinate o seed test).
- più worker possono superare la `capacity` perché il count è MVCC-stale.

Inoltre l'`ON CONFLICT (event_id, user_id)` presuppone un constraint che NON è dichiarato nelle migrations viste (`bookings` ha solo `qr_token unique`). Se il constraint manca, in caso di accept multipli dello stesso utente (doppio click sul link) si crea un secondo booking confermato.

**Azione:**
1. aggiungere `select 1 from events where id = v_row.event_id for update;` in cima al body.
2. dichiarare `create unique index if not exists bookings_event_user_active_uq on public.bookings(event_id, user_id) where status in ('pending','confirmed');` — partial perché un utente può ri-iscriversi dopo cancellazione.
3. Verificare che l'`ON CONFLICT` punti al constraint corretto, oppure usare `insert ... where not exists`.

---

## 🟠 ALTO

### A1 — `create_event_booking` non considera la waitlist nel calcolo di sold-out
File: `migrations/20260623_bookings_qr_and_rpc.sql` + `migrations/20260626_waitlist.sql`.
La RPC verifica solo `count(confirmed) >= capacity`. Se un utente in waitlist con `offered` non ha ancora accettato, il posto è "tenuto" dall'offerta ma il prossimo utente che apre la pagina vede ancora "Prenota" finché il count non si aggiorna. Possibile race: l'utente prenota normalmente e batte sul tempo chi ha l'offerta.
**Azione:** in `create_event_booking` considerare capacity come `capacity - count(waitlist offered attivi)`, oppure trattare l'offerta come un soft-hold sottratto.

### A2 — Cancellazione booking via UI admin non passa da `cancel-event-booking`
File: `src/pages/admin/AdminPrenotazioni.tsx`, `useAdminBookings.ts`.
L'admin cancella con UPDATE diretto su `bookings`. Il trigger DB promuove correttamente, ma l'email di offerta dipende esclusivamente dal worker (vedi C1). Fino a che il worker non è schedulato in modo affidabile, le cancellazioni admin = no notifica.

### A3 — Mancata invalidazione query/UI dopo promozione
File: `src/hooks/useWaitlist.ts`, `useEventDetail.ts`.
Quando il trigger DB promuove un utente, la UI dell'utente "in attesa" non si aggiorna in tempo reale: serve refresh manuale o navigazione. Per UX accettabile servirebbe subscription Realtime sulle righe `waitlist` dove `user_id = auth.uid()`.

### A4 — `cancel-event-booking` esegue `expire_and_repromote_all` (global) ad ogni cancellazione
File: `supabase/functions/cancel-event-booking/index.ts:70`.
Inefficiente e con effetti collaterali: una singola cancellazione su un evento può scatenare promozioni su tutti gli eventi sold-out. Sostituire con `expire_stale_waitlist_offers(event_id)` e nessuna ri-promote esplicita (il trigger ha già promosso questo specifico evento).

### A5 — Manca `SITE_URL` come secret obbligatorio
Le edge functions `cancel-event-booking`, `join-waitlist`, `process-waitlist-outbox` costruiscono link offerta concatenando `SITE_URL`. Se la variabile non è impostata, il link è `/waitlist/accept?token=…` (relativo) → email rotta. Aggiungere validazione `if (!SITE_URL) throw 'site_url_missing'` e documentarlo in `.env.example`.

### A6 — Storage policy organizer: il file insert sul nuovo evento richiede l'evento già salvato
File: `migrations/20260625_storage_event_covers_organizer.sql`.
Il path `event-covers/{event_id}/...` richiede che `events.id` esista e `organizer_id = auth.uid()`. In creazione di un evento nuovo l'organizer DEVE usare il path `drafts/{user_id}/...` poi spostare il file. Verificare che `useAdminEvents.ts` rispetti la convenzione o si rischia upload negato con 403.

---

## 🟡 MEDIO

### M1 — Doppio percorso di cancellazione waitlist
Esiste sia la policy "user update own" su `waitlist` sia la RPC `cancel_waitlist_entry`. Il client può fare `update waitlist set status='cancelled'` direttamente e bypassare il logging in `waitlist_events` (lì il trigger `_waitlist_log_status_change` interviene comunque per `cancelled`). Comportamento OK ma documentare quale è l'API canonica e disabilitare l'altra.

### M2 — `accept_waitlist_offer` non setta `qr_token` e `reference_code`
Il booking creato dall'accept ha `qr_token = NULL` → l'utente non riceverà mai una mail con QR per il check-in. Allineare lo schema a `create_event_booking` (generare token + reference + invio email post-accept).

### M3 — Trigger `bookings_waitlist_auto_promote` non gestisce INSERT
Se uno script popola `bookings` con un `confirmed` fittizio e poi lo elimina, il trigger reagisce. OK. Ma se la capienza viene **aumentata** (`update events set capacity = capacity+1`), nessun trigger sull'eventi che promuova. Aggiungere trigger `AFTER UPDATE OF capacity ON events`.

### M4 — `process-waitlist-outbox` legge sempre top 50 senza ordering deterministico
Aggiungere `.order('offered_at', {ascending: true})` per FIFO e prevenire fame.

### M5 — `checkin_by_qr_token` non distingue evento "non ancora iniziato"
Permette check-in giorni prima dell'evento. Aggiungere finestra (`starts_at - interval '6 hours'` → `ends_at + interval '6 hours'`).

### M6 — `create_event_booking` ritorna `pending` esistente come successo
Se l'utente aveva una prenotazione `pending` (mai usata oggi ma possibile a futuro con pagamenti), la RPC la ritorna come confermata senza promuoverla. Esplicitare il return o filtrare solo `confirmed`.

### M7 — Email best-effort senza retry
`create-event-booking`, `join-waitlist`, `cancel-event-booking` loggano fallimenti email su console ma non hanno coda retry. Per la waitlist-offer almeno il worker outbox fa retry implicito. Per la booking confirmation non c'è recupero: utente prenota ma se Resend è down nessuno se ne accorge. Aggiungere flag `email_logs.status='failed'` con job di re-send.

### M8 — Loading/empty state Waitlist
`AdminEventoWaitlist.tsx` e `MyWaitlist.tsx` mostrano lista vuota senza CTA / empty state localizzato. Migliorare per UX organizer.

### M9 — Mobile UX `AdminCheckinScan`
Ok input manuale dopo il fix precedente, ma su schermi <360px il preview video taglia i bordi. Verificare safe-area su iOS.

---

## 🟢 BASSO

- B1 — `console.error/warn` lasciati in produzione su molte edge functions (utile per Supabase logs ma rumoroso).
- B2 — `_waitlist_compute_deadline` è `immutable` ma usa `now()` → dovrebbe essere `volatile`/`stable`. Postgres non lo applica perché lo inlinea, ma è scorretto formalmente.
- B3 — Nessun rate-limit su `join-waitlist`: utente malevolo può spammare la RPC (gli errori vengono restituiti, ma costa CPU).
- B4 — `waitlist_events.payload` è `jsonb` senza schema documentato.
- B5 — `event_capacity_status` non espone `offered_count` separato: UI potrebbe mostrarlo.
- B6 — `cancel-event-booking` dichiara `let body` con tipo stretto ma non valida i campi extra.

---

## Check tematici

### Race condition / doppie prenotazioni
- `create_event_booking`: ✅ usa `for update` su `events`.
- `accept_waitlist_offer`: ❌ vedi **C2**.
- `_waitlist_promote_locked`: ✅ usa `pg_advisory_xact_lock` + `for update skip locked`.

### Doppie promozioni waitlist
- ✅ idempotenza nel check "esiste già offerta attiva".
- ⚠️ se il trigger DB e `cancel-event-booking` corrono in parallelo entrambi chiamano la stessa funzione lock-protetta → safe, ma genera due read inutili. OK.

### Offerte scadute
- ✅ `expire_stale_waitlist_offers` + cron `expire_and_repromote_all` ogni minuto (se pg_cron presente).
- ⚠️ Se pg_cron NON è attivo nel progetto Supabase, la scadenza avviene solo "on touch" (chiamata `promote_next_waitlist`). Verificare e abilitare.

### No-show
- Nessuna gestione esplicita (nessuna marcatura `no_show` su `checkins`). Non bloccante.

### Gestione errori
- ✅ ERROR_MAP coerente su tutte le edge functions.
- ⚠️ Lato client servirebbe un toast unificato per error codes waitlist.

### Mobile UX / Loading / Empty
- Vedi M8, M9. Resto già coperto nei report precedenti.

### RLS Supabase
- ✅ `waitlist`, `waitlist_events`, `bookings`, `events`, `profiles` tutte con RLS attiva.
- ✅ `promote_next_waitlist` revocata da `authenticated/anon`.
- ⚠️ Policy "waitlist user cancel own" consente UPDATE di qualsiasi colonna (l'utente può cambiare `position`, `status`, `offer_token`). Vincolare la policy con `with check (status in ('cancelled','waiting','offered'))` non basta. Meglio: rimuovere la policy update lato utente e forzare la RPC `cancel_waitlist_entry`. **Privilege escalation potenziale** → considerare upgrade a 🟠 ALTO se confermato.

### Edge Functions
| Function | Auth | Idempotenza | Note |
|---|---|---|---|
| `create-event-booking` | user JWT | ✅ RPC | OK |
| `cancel-event-booking` | user JWT | ⚠️ side-effect global | A4 |
| `join-waitlist` | user JWT | ✅ via RPC | OK |
| `accept-waitlist-offer` | user JWT | ⚠️ vedi C2 | |
| `process-waitlist-outbox` | service-role hard check | ✅ | confermare schedule |
| `send-email` | open + check template | ✅ logs | |

### Storage
- ✅ Bucket pubblico in lettura, scritture ristrette.
- ⚠️ A6 sulla convenzione drafts/{uid}.

---

## Test manuali consigliati prima del go-live

1. **Race capienza:** capacity=1, 3 utenti premono "Prenota" entro 100ms → 1 confirmed, 2 errori `sold_out`.
2. **Auto-promotion via admin:** admin cancella un booking dal pannello → entro 2 min il primo in waitlist riceve email (verifica schedule worker).
3. **Auto-promotion via utente:** utente cancella la propria prenotazione → email entro 10s (sincrona via `cancel-event-booking`).
4. **Doppio click su link offerta:** aprire la stessa accept-url in due tab → un solo booking, l'altro errore `not_offered` o `forbidden`.
5. **Offerta scaduta:** forzare `offer_expires_at = now() - 1m` su una riga `offered` → entro 1 min status `expired` e il successivo riceve offerta.
6. **QR replay:** scansionare due volte lo stesso QR → seconda risposta `already_used`.
7. **Organizer upload cover:** loggato come organizer, evento proprio → upload OK; evento altrui → 403.
8. **Email down:** simulare `RESEND_API_KEY` errata → email_logs status=failed, prenotazione comunque creata.
9. **Realtime offerta:** mentre l'utente A è sulla pagina evento, cancellare un confirmed → verifica se la UI di A passa da "in attesa" a "hai un'offerta" (oggi: NO, vedi A3).
10. **Mobile scan:** iPhone Safari, negato permesso camera → fallback input manuale funziona.

---

## Roadmap minima per go-live

1. 🔴 **C1**: confermare/attivare schedule `process-waitlist-outbox` + alert su offerte non notificate.
2. 🔴 **C2**: lock `for update` su `events` dentro `accept_waitlist_offer` + unique index parziale su `bookings(event_id,user_id)`.
3. 🟠 A1, A2, A5 entro la prima settimana.
4. 🟠 Riconsiderare la policy "waitlist user cancel own" (sezione RLS).
5. 🟡/🟢 pianificabile post-lancio.

Tutto il resto (auth, OAuth, Resend, schema profiles, error boundary, storage organizer, QR check-in robusto) risulta in stato production-ready secondo i report precedenti e l'ispezione di questa audit.
