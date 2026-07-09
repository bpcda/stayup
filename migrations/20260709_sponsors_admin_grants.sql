-- Consente agli admin (via RLS policy "sponsors admin all") di scrivere
-- sulla tabella sponsors dal client. Senza questi GRANT PostgREST rifiuta
-- INSERT/UPDATE/DELETE anche con la policy attiva.

grant insert, update, delete on public.sponsors to authenticated;
