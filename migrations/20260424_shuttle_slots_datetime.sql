-- ============================================================
-- Shuttle slots: add precise datetime support (idempotent, non-destructive)
-- ============================================================
-- Goal: allow admins to schedule shuttles on ANY date/time via a calendar,
-- not just the legacy "25 Aprile" / "26 Aprile". The text column `giorno`
-- is preserved as a human-readable label so existing rows, bookings,
-- RLS policies, foreign keys and the public form keep working unchanged.
--
-- Production safety:
--   * All ALTERs use IF NOT EXISTS / DO blocks → safe to re-run
--   * No column dropped, no row deleted, no constraint that could orphan data
--   * `data` is nullable so existing rows remain valid without backfill
--   * Backfill is best-effort: only populates NULLs, never overwrites
-- ============================================================

-- 1. shuttle_slots: add `data` (timestamptz) -----------------------------
ALTER TABLE public.shuttle_slots
  ADD COLUMN IF NOT EXISTS data timestamptz;

-- 2. shuttle_return_slots: add `data` ------------------------------------
ALTER TABLE public.shuttle_return_slots
  ADD COLUMN IF NOT EXISTS data timestamptz;

-- 3. bookings: add `data_andata` and `data_ritorno` ----------------------
-- (Nullable; existing string-based columns `giorno` + `orario` stay intact.)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS data_andata  timestamptz,
  ADD COLUMN IF NOT EXISTS data_ritorno timestamptz;

-- 4. Helpful indexes (safe if already exist) -----------------------------
CREATE INDEX IF NOT EXISTS shuttle_slots_data_idx
  ON public.shuttle_slots (data);

CREATE INDEX IF NOT EXISTS shuttle_return_slots_data_idx
  ON public.shuttle_return_slots (data);

-- 5. Best-effort backfill for legacy "25 Aprile" / "26 Aprile" rows ------
-- Only fills NULLs. Uses 2026 as the reference year for the StayUp event.
-- Does nothing for rows whose `giorno` doesn't match this legacy pattern.
DO $$
DECLARE
  ref_year int := 2026;
BEGIN
  UPDATE public.shuttle_slots
     SET data = (
           (ref_year || '-04-' ||
            CASE WHEN giorno ILIKE '25%' THEN '25'
                 WHEN giorno ILIKE '26%' THEN '26'
            END
           )::date + orario::time
         ) AT TIME ZONE 'Europe/Rome'
   WHERE data IS NULL
     AND orario ~ '^\d{1,2}:\d{2}$'
     AND (giorno ILIKE '25%' OR giorno ILIKE '26%');

  UPDATE public.shuttle_return_slots
     SET data = (
           (ref_year || '-04-' ||
            CASE WHEN giorno ILIKE '25%' THEN '25'
                 WHEN giorno ILIKE '26%' THEN '26'
            END
           )::date + orario::time
         ) AT TIME ZONE 'Europe/Rome'
   WHERE data IS NULL
     AND orario ~ '^\d{1,2}:\d{2}$'
     AND (giorno ILIKE '25%' OR giorno ILIKE '26%');
END $$;
