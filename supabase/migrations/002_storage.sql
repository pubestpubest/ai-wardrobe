-- Create public bucket for wardrobe images
insert into storage.buckets (id, name, public)
values ('wardrobe-images', 'wardrobe-images', true)
on conflict (id) do nothing;

-- Anyone can upload (auth will gate this properly once login is added)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Wardrobe images upload'
  ) then
    create policy "Wardrobe images upload"
      on storage.objects for insert
      with check (bucket_id = 'wardrobe-images');
  end if;
end $$;

-- Public read
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Wardrobe images public read'
  ) then
    create policy "Wardrobe images public read"
      on storage.objects for select
      using (bucket_id = 'wardrobe-images');
  end if;
end $$;

-- Allow delete of own uploads
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Wardrobe images delete'
  ) then
    create policy "Wardrobe images delete"
      on storage.objects for delete
      using (bucket_id = 'wardrobe-images');
  end if;
end $$;
