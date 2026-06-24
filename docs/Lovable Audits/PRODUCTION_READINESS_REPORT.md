# Production Readiness Report — StayUp

> Audit del progetto come se dovesse andare online oggi.
> **Solo analisi**: nessuna modifica di codice, nessuna feature implementata.

Data: 2026-06-24
Stack: React 18 + Vite + Tailwind + Supabase + Resend
Esito complessivo: **NON pronto per la produzione** — presenti blocker CRITICI.

---

## Punteggio sintetico

| Severità | # findings |
|---|---|
| 🔴 CRITICO | 5 |
| 🟠 ALTO | 14 |
| 🟡 MEDIO | 12 |
| 🟢 BASSO | 4 |
| **Totale** | **35** |

Almeno i 5 CRITICI vanno chiusi prima di pubblicare. Gli ALTI sono fortemente raccomandati prima di portare utenti reali.

---

## 🔴 CRITICI (bloccanti per il go-live)

### C-1 · OAuth Google: pulsante visibile ma non funzionante
- `src/hooks/useAuth.tsx:155-162` — `signInWithGoogle()` ritorna sempre `{ error: "Accesso con Google non ancora disponibile..." }`.
- `src/pages/Auth.tsx:117-126` — bottone "Continua con Google" attivo e cliccabile.
- L'utente clicca → riceve toast d'errore. Esperienza rotta in prima pagina.

### C-2 · Route `/auth/callback` inesistente
- Nessuna pagina `AuthCallback`, nessuna `<Route path="/auth/callback">` in `src/App.tsx:44-67`.
- Se Google OAuth venisse abilitato sul Supabase Project, il redirect provider finirebbe sul catch-all 404.

### C-3 · Doppia istanza Supabase client con configurazione divergente
- `src/integrations/supabase/client.ts:12-14` (usato dal 95% del codice).
- `src/lib/supabase/client.ts` → `getSupabaseBrowser()` usato da `src/services/supabase/storage.service.ts:6`.
- Le due istanze possono divergere su `localStorage` key/storage adapter → sessioni disallineate, upload che falliscono pur essendo loggati, e in ambiente senza env vars `storage.service.ts` può sollevare `TypeError: cannot read properties of null` (non c'è check `isSupabaseConfigured`).

### C-4 · Schema mismatch profiles: `full_name` vs `first_name`/`last_name`
- `migrations/20260623_stayup_v2_schema.sql:98-109` definisce `profiles` con **solo** `full_name`.
- `migrations/20260424_profiles_autocreate.sql:6,24`, `src/hooks/useProfile.ts:19`, `src/pages/Profilo.tsx`, `src/pages/admin/AdminEventoIscritti.tsx` usano `first_name` e `last_name`.
- Su un'istanza Supabase popolata applicando **solo** la v2 schema, le query falliscono con `column does not exist`. Lo storico è coperto dalla migration `20260424_*` solo se eseguita anche dopo v2 → ordine fragile, non idempotente fra installazioni nuove.

### C-5 · Nessun React Error Boundary globale
- `src/main.tsx` e `src/App.tsx` non hanno `<ErrorBoundary>`.
- Qualsiasi eccezione non gestita produce schermata bianca senza recovery (`Try again`, log dell'errore, ecc.).

---

## 🟠 ALTI

### A-1 · `useAuth.getSession()` senza `.catch` → loading infinito
- `src/hooks/useAuth.tsx:87-92`: se `getSession()` rigetta (rete offline), `setLoading(false)` non viene mai eseguito → app bloccata sullo spinner.

### A-2 · `useEventDetail` catch silenzioso
- `src/hooks/useEventDetail.ts:50-53`: errore evento solo `console.error`, nessun toast/stato utente. La pagina sembra "evento non trovato" anche per errori 5xx temporanei.

### A-3 · Mittente Resend fallback `onboarding@resend.dev`
- `supabase/functions/create-event-booking/index.ts:112`: fallback `"StayUp <onboarding@resend.dev>"`. Dominio sandbox Resend: emails verso destinatari reali **non recapitate** in produzione.

### A-4 · `RESEND_FROM_EMAIL` mancante → HTTP 500
- `supabase/functions/send-email/index.ts:198-201` ritorna 500 se il secret manca, bloccando ogni invio.

### A-5 · Storage policy `event-covers` esclude `organizer`
- `migrations/20260424_site_settings_and_storage.sql:68-72` consente upload solo a `admin`, ma `/admin/eventi` è accessibile anche a `organizer`. Un organizer non può caricare la copertina del proprio evento → bug funzionale silenzioso.

### A-6 · Validazione MIME upload solo client-side
- `src/hooks/useAdminEvents.ts:55-58` controlla `file.type` e size lato client. Storage Supabase non ha restrizioni MIME → caricare file arbitrari mascherati da immagine è possibile.

### A-7 · `index.html` `lang="en"` su sito italiano
- `index.html:2`: `<html lang="en">`. Screen reader, traduttori e SEO ricevono lingua sbagliata.

### A-8 · Nessun canonical, nessun `og:url`
- `index.html:3-15`: mancano `<link rel="canonical">` e `<meta property="og:url">`. Rischio duplicati su Google e cattive anteprime social.

### A-9 · Nessuna `sitemap.xml`
- `public/` contiene solo `robots.txt`, `favicon.ico`, `placeholder.svg`. Niente sitemap → indicizzazione lenta degli eventi.

### A-10 · Scanner QR: camera negata = nessun fallback UI
- `src/pages/admin/AdminCheckinScan.tsx:149`: `onError={() => {/* gestito dall'overlay */}}` (no-op). Se l'utente nega il permesso fotocamera, vede solo un riquadro nero senza spiegazione né link "Apri impostazioni".

### A-11 · Google Fonts caricato via `@import` senza preconnect
- `src/index.css:5`: `@import url('https://fonts.googleapis.com/css2?...')` blocca il render fino al fetch CSS. Manca `<link rel="preconnect">` in `index.html`. Impatto su LCP e dipendenza esterna problematica (ad-blocker, GDPR EU).

### A-12 · CORS `Access-Control-Allow-Origin: *` su edge function autenticata
- `supabase/functions/create-event-booking/index.ts:111`: wildcard CORS su endpoint che riceve JWT. Accettabile per una SPA pubblica, ma da documentare. In contesti enterprise serve allow-list.

### A-13 · BottomNav senza `aria-label`
- `src/components/layout/AppLayout.tsx:48`: `<nav className="md:hidden ...">` senza `aria-label`. Screen reader non distingue tra le nav presenti.

### A-14 · `window.location.origin` per `emailRedirectTo`
- `src/hooks/useAuth.tsx:111`: usa `window.location.origin` invece di una `VITE_SITE_URL`. Sui preview Vercel/Lovable l'origin è quello effimero → link di conferma email invalidi/scaduti.

---

## 🟡 MEDI

### M-1 · `EventoDettaglio` loading = testo senza skeleton
- `src/pages/EventoDettaglio.tsx:37`: `Caricamento…`. Niente skeleton hero/contenuto → CLS elevato.

### M-2 · `MyEvents.tsx:50-64` — `setLoading(false)` non chiamato se utente assente
- Spinner persistente se `user` ancora `null` al primo render.

### M-3 · Loading admin generici
- `useAdminEvents.ts:75-93` ignora errori di caricamento categories/sponsors (`if (!catRes.error)`): l'editor evento può apparire senza categorie e nessuno saprà perché.

### M-4 · Form Auth: `grid-cols-2` senza breakpoint
- `src/pages/Auth.tsx:175`: nome/cognome side-by-side anche su < 360 px → campi troppo stretti.

### M-5 · Header mobile senza accesso rapido al profilo
- `src/components/layout/AppLayout.tsx:136-139`: top bar mobile ha solo logo + LanguageSwitcher. Profilo/Auth solo via BottomNav.

### M-6 · `AdminGuard` non preserva `state.from`
- `src/components/AdminGuard.tsx:26-28`: redirect a `/auth` senza ricordare la pagina di partenza. `UserGuard.tsx:31` lo fa correttamente — comportamento incoerente.

### M-7 · `newsletter_subscribers` anon insert `with check (true)`
- `migrations/20260623_stayup_v2_schema.sql:503-505`: chiunque può iniettare email arbitrarie (spam farming, enumerazione). Nessun captcha né rate limiting applicativo.

### M-8 · `site_settings` lettura pubblica per `anon`
- `migrations/20260424_site_settings_and_storage.sql:15-19`: tutta la tabella è leggibile da `anon`. Oggi i valori sono volutamente pubblici (telefono, social), ma una futura chiave segreta verrebbe esposta. Manca convenzione `is_public` o naming.

### M-9 · Nessuna preview/conferma upload copertina
- `src/hooks/useAdminEvents.ts` carica subito su selezione file. Errore utente = upload già consumato.

### M-10 · SEO: nessun twitter:card, meta description statica, niente JSON-LD `Event`
- `index.html:8-15` — meta description generica per tutte le pagine; nessuna preview Twitter/X; nessuno schema strutturato per eventi.

### M-11 · Race condition flickering `AdminGuard`
- `src/hooks/useAuth.tsx:81-83`: `setTimeout(checkRoles, 0)`. Per ~1 frame `isAdmin` è `false` → la pagina admin può lampeggiare "accesso negato" prima di renderizzare.

### M-12 · Resend: nessun retry / nessuna gestione 429
- `create-event-booking` e `send-email`: una risposta 429 di Resend o un 5xx temporaneo si traducono in fallimento permanente registrato come `failed`.

### M-13 · `/profilo` doppia protezione
- `src/App.tsx:50` (`<UserGuard>`) + `src/pages/Profilo.tsx:61` (`if (!user) return <Navigate to="/auth"/>`). Ridondante, non dannoso ma incoerente.

### M-14 · `cover_image_url` rotta = icona browser
- `src/components/event-detail/EventHero.tsx` non ha `onError` di fallback. Se il file è stato eliminato dallo storage ma l'URL resta in DB, si vede l'icona "immagine rotta".

### M-15 · `!isSupabaseConfigured` mostra "Evento non trovato"
- `src/hooks/useEventDetail.ts:24`: messaggio errato, dovrebbe segnalare "backend non configurato".

---

## 🟢 BASSI

### B-1 · `console.error` in `NotFound.tsx:8` → leak struttura routing in console produzione.
### B-2 · `console.log` con dati personali in `src/hooks/useShuttleForm.ts:232` quando Supabase non configurato.
### B-3 · `robots.txt` senza `Sitemap:` e senza `Disallow: /admin`.
### B-4 · Dialog QR (`MyEvents.tsx`): `<img>` 260×260 senza `max-w-full` → overflow su schermi < 290 px.
### B-5 · `src/pages/EventoDettaglio.tsx:63` — CTA mostra solo `"…"` durante busy: poco informativo.
### B-6 · `BottomNav` touch target ~36 px (sotto i 44 px WCAG raccomandati).
### B-7 · `NotFound.tsx:16` usa `<a href="/">` invece di `<Link>` → full reload.

---

## ✅ Cose che funzionano bene

- RLS abilitata su tutte le tabelle `public.*`; pattern `has_role` SECURITY DEFINER corretto.
- Route admin tutte dentro `<AdminGuard>` con `requireRole` differenziato (`admin` vs `organizer`).
- RPC `create_event_booking` e `checkin_by_qr_token`: `SECURITY DEFINER`, revoca `public/anon`, grant solo `authenticated`, idempotenti.
- Scanner QR: cooldown + `paused` + isProcessing — anti doppia lettura solido.
- Empty states presenti su `/eventi` e `/profilo` MyEvents.
- Catch-all `*` → `NotFound`.
- Contrasto colori (tema scuro) ben oltre WCAG AA.
- HTML escaping nelle email inline (`escapeHtml`).
- BottomNav e AppLayout mobile-first.

---

## Roadmap minima al go-live

1. Chiudere tutti i CRITICI (C-1 → C-5).
2. Consolidare config Resend (A-3, A-4) e abilitare effettivamente la copertura organizer su storage (A-5).
3. SEO base: `lang="it"`, canonical, sitemap, preconnect Google Fonts (A-7, A-8, A-9, A-11).
4. Aggiungere `ErrorBoundary` + fallback camera (C-5, A-10).
5. Validare upload server-side (A-6).
6. Solo poi affrontare i MEDI (skeleton, redirect post-login, JSON-LD Event, ecc.).

Tutti i punti BASSI possono essere differiti al primo post-release.
