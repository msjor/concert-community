-- Discovery: follow graph (run after 001–003)

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_id_idx on public.follows (follower_id);
create index if not exists follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

create table if not exists public.band_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  band_name text not null check (char_length(trim(band_name)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, band_name)
);

create index if not exists band_follows_user_id_idx on public.band_follows (user_id);
create index if not exists band_follows_band_name_idx on public.band_follows (band_name);

alter table public.band_follows enable row level security;

drop policy if exists "Band follows are viewable by everyone" on public.band_follows;
create policy "Band follows are viewable by everyone"
  on public.band_follows for select using (true);

drop policy if exists "Users can follow bands" on public.band_follows;
create policy "Users can follow bands"
  on public.band_follows for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unfollow bands" on public.band_follows;
create policy "Users can unfollow bands"
  on public.band_follows for delete
  using (auth.uid() = user_id);
