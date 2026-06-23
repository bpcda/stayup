-- ============================================================================
-- 20260625_storage_event_covers_organizer
-- ----------------------------------------------------------------------------
-- Aggiorna le RLS policy del bucket `event-covers` per consentire upload /
-- update / delete anche agli organizer, ma SOLO per file appartenenti a eventi
-- di loro competenza (events.organizer_id = auth.uid()) oppure a file in
-- un'area "draft" personale (drafts/{user_id}/...).
--
-- Convenzione path applicata dal client:
--   event-covers/{event_id}/cover/<filename>
--   event-covers/{event_id}/gallery/<filename>
--   event-covers/drafts/{user_id}/cover/<filename>      (evento non ancora salvato)
--   event-covers/drafts/{user_id}/gallery/<filename>
--
-- Lettura: pubblica (le immagini degli eventi sono mostrate in homepage).
-- Admin: pieni poteri.
-- Organizer: solo file dei propri eventi o dei propri draft.
-- Utenti normali: nessuna scrittura.
--
-- Idempotente: ogni policy viene droppata prima della creazione.
-- ============================================================================

-- 1) Bucket presente e pubblico (idempotente).
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do update set public = excluded.public;

-- 2) Drop di TUTTE le policy storiche su event-covers (nomi noti).
drop policy if exists "Public read event-covers"            on storage.objects;
drop policy if exists "Admins upload event-covers"          on storage.objects;
drop policy if exists "Admins update event-covers"          on storage.objects;
drop policy if exists "Admins delete event-covers"          on storage.objects;
drop policy if exists "event-images public read"            on storage.objects;
drop policy if exists "event-images admin write"            on storage.objects;
drop policy if exists "event-images admin update"           on storage.objects;
drop policy if exists "event-images admin delete"           on storage.objects;
drop policy if exists "event-covers public read"            on storage.objects;
drop policy if exists "event-covers admin or organizer insert" on storage.objects;
drop policy if exists "event-covers admin or organizer update" on storage.objects;
drop policy if exists "event-covers admin or organizer delete" on storage.objects;

-- 3) Helper inline: l'utente corrente può scrivere nel path indicato?
-- Usa storage.foldername(name) che ritorna un text[] dei segmenti di cartella.
--   parts[1] = primo segmento (event_id oppure 'drafts')
--   parts[2] = secondo segmento (user_id per i draft, oppure 'cover'/'gallery')
-- Path traversal non è possibile: Supabase Storage normalizza le chiavi e
-- non interpreta '..'; comunque vincoliamo che parts[1] sia un UUID valido
-- (o letteralmente 'drafts').

-- 4) Public read — tutte le immagini sono leggibili pubblicamente.
create policy "event-covers public read"
  on storage.objects for select
  to public
  using (bucket_id = 'event-covers');

-- 5) Insert — admin oppure organizer sul proprio scope.
create policy "event-covers admin or organizer insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and (
      public.has_role(auth.uid(), 'admin')
      or (
        public.has_role(auth.uid(), 'organizer')
        and (
          -- Draft personale: drafts/{user_id}/...
          (
            (storage.foldername(name))[1] = 'drafts'
            and (storage.foldername(name))[2] = auth.uid()::text
          )
          -- Oppure file di un evento di cui sono organizer.
          or exists (
            select 1 from public.events e
            where e.id::text = (storage.foldername(name))[1]
              and e.organizer_id = auth.uid()
          )
        )
      )
    )
  );

-- 6) Update — stesse condizioni dell'insert (su USING e WITH CHECK).
create policy "event-covers admin or organizer update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      public.has_role(auth.uid(), 'admin')
      or (
        public.has_role(auth.uid(), 'organizer')
        and (
          (
            (storage.foldername(name))[1] = 'drafts'
            and (storage.foldername(name))[2] = auth.uid()::text
          )
          or exists (
            select 1 from public.events e
            where e.id::text = (storage.foldername(name))[1]
              and e.organizer_id = auth.uid()
          )
        )
      )
    )
  )
  with check (
    bucket_id = 'event-covers'
    and (
      public.has_role(auth.uid(), 'admin')
      or (
        public.has_role(auth.uid(), 'organizer')
        and (
          (
            (storage.foldername(name))[1] = 'drafts'
            and (storage.foldername(name))[2] = auth.uid()::text
          )
          or exists (
            select 1 from public.events e
            where e.id::text = (storage.foldername(name))[1]
              and e.organizer_id = auth.uid()
          )
        )
      )
    )
  );

-- 7) Delete — stesse condizioni.
create policy "event-covers admin or organizer delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      public.has_role(auth.uid(), 'admin')
      or (
        public.has_role(auth.uid(), 'organizer')
        and (
          (
            (storage.foldername(name))[1] = 'drafts'
            and (storage.foldername(name))[2] = auth.uid()::text
          )
          or exists (
            select 1 from public.events e
            where e.id::text = (storage.foldername(name))[1]
              and e.organizer_id = auth.uid()
          )
        )
      )
    )
  );
