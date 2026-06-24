# Event Editor — Audit

Data: 2026-06-24
Scope: `src/pages/admin/AdminEventi.tsx`, `src/components/admin/events/*`, `src/hooks/useAdminEvents.ts`, `src/services/supabase/events.service.ts`, `src/services/supabase/storage.service.ts`, migrazioni `events.*`.

## Esito per funzione

| # | Funzione | Stato | Note |
|---|---|---|---|
| 1 | Creazione evento | 🟡 PARZIALE → ✅ con fix | Bug slug: in insert veniva forzato `slug + "-" + random4` anche su slug manuale. Risolto. |
| 2 | Modifica evento | ✅ COMPLETA | Pre-popolazione e update funzionanti. |
| 3 | Pubblicazione | 🟡 PARZIALE → ✅ con fix | `published_at` non veniva mai popolato; aggiunto auto-set su transizione `draft → published`. Badge tabella ora mostra `status` reale. |
| 4 | Annullamento | 🟡 PARZIALE | Status `cancelled` salvato. Notifica iscritti via email **non implementata** (fuori scope editor — vedi `CORE_EVENT_FLOW_GAP_ANALYSIS.md`). |
| 5 | Archiviazione / chiusura | 🟡 PARZIALE → ✅ con fix | Enum frontend allineato al DB: aggiunti `archived` ed `ended`. |
| 6 | Gestione capienza | 🟡 PARZIALE → ✅ con fix | Aggiunto contatore iscritti `posti X / Y` in tabella ed editor (calcolato lato client con count su `bookings` confermati). Hard sold-out già garantito dalla RPC `create_event_booking`. |
| 7 | Upload banner / cover | 🟡 PARZIALE → ✅ con fix | "Rimuovi" ora cancella anche il file dallo Storage (`storage.from('event-covers').remove`). |
| 8 | Upload gallery | 🟡 PARZIALE → ✅ con fix | Rimozione singola immagine ora cancella anche il file. Drag-drop/ordinamento restano un nice-to-have non implementato. |
| 9 | Categorie | 🟡 PARZIALE | Select monovalente funzionante. **CRUD admin non implementato** (out-of-scope dichiarato; oggi si gestiscono via SQL/Studio). |
| 10 | Sponsor | 🟡 PARZIALE | Toggle multi-sponsor funzionante. **CRUD admin sponsor non implementato** (stessa motivazione). |
| 11 | Slug | 🟡 PARZIALE → ✅ con fix | Slug manuale viene rispettato; vuoto → trigger DB lo genera. Su violazione unicità: retry con suffisso univoco e toast informativo. |
| 12 | SEO metadata | ❌ ASSENTE → ✅ implementato | Aggiunta migration con colonne `seo_title`, `seo_description`, `og_image_url`, `published_at`. Nuova tab SEO nell'editor con preview meta. |

## Gap residui dichiarati (non implementati)

- **CRUD pannello admin per `event_categories`** e **`sponsors`**: oggi si manipolano via Supabase Studio. Scope esteso, non strettamente parte dell'editor singolo evento.
- **Email automatica agli iscritti** quando un evento passa a `cancelled`. Richiede template Resend dedicato + invocazione lato `saveEvent`.
- **Drag & drop / ordinamento gallery** e **alt text per immagine**: lo storage attuale non ha metadati per-asset.
- **JSON-LD `Event` lato pubblico** (su `/eventi/:slug`): la migration aggiunge i campi SEO, ma l'iniezione nel `<head>` lato frontend pubblico è separata dall'editor admin e va affrontata in un task SEO dedicato.

## File toccati in questa fase

- `migrations/20260624_event_editor_seo_fields.sql` _(nuovo)_
- `src/interfaces/events.ts`
- `src/hooks/useAdminEvents.ts`
- `src/components/admin/events/EventModals.tsx`
- `src/components/admin/events/EventsTable.tsx`
- `EVENT_EDITOR_AUDIT.md` _(questo file)_

Nessuna modifica ai servizi `events.service.ts` / `storage.service.ts` (non collegati alla UI; ridondanti, da consolidare in un task di refactor architetturale).
