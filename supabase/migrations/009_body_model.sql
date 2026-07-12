-- Virtual Model: AI-generated full-body avatar from a scanned photo
create table if not exists public.body_models (
  id                uuid primary key default gen_random_uuid(),
  height_cm         numeric(5,1) not null check (height_cm > 0 and height_cm < 300),
  weight_kg         numeric(5,1) not null check (weight_kg > 0 and weight_kg < 400),
  gender            text,
  source_image_url  text not null,
  avatar_image_url  text not null,
  created_at        timestamptz not null default now()
);

create index if not exists body_models_created_at_idx on public.body_models (created_at desc);

alter table public.body_models enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'body_models' and policyname = 'Guest mode — open'
  ) then
    create policy "Guest mode — open" on public.body_models for all using (true) with check (true);
  end if;
end $$;

-- Storage bucket for scan photos + generated avatars
insert into storage.buckets (id, name, public)
values ('body-model-images', 'body-model-images', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Body model images upload'
  ) then
    create policy "Body model images upload"
      on storage.objects for insert
      with check (bucket_id = 'body-model-images');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Body model images public read'
  ) then
    create policy "Body model images public read"
      on storage.objects for select
      using (bucket_id = 'body-model-images');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Body model images delete'
  ) then
    create policy "Body model images delete"
      on storage.objects for delete
      using (bucket_id = 'body-model-images');
  end if;
end $$;
