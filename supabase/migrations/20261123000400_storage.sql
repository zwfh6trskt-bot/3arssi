-- =====================================================================
-- 3ARSSI — 0004 Storage for portfolio and category images
-- Public bucket (images are shown to visitors); only staff may write.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select
  using (bucket_id = 'media');
create policy media_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff());
create policy media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
