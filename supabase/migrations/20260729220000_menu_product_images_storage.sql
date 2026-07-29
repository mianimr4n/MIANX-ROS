-- Public product image bucket for Admin Menu uploads (service role writes via API).
-- Public SELECT so customer website and catalog can resolve image_url without auth.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-product-images',
  'menu-product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read menu product images" on storage.objects;
create policy "Public read menu product images"
  on storage.objects
  for select
  using (bucket_id = 'menu-product-images');
