-- Concert Community MVP schema
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.attendee_status as enum ('going', 'interested');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  favorite_genres text[] default '{}',
  bio text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  band_name text not null,
  venue text not null,
  city text not null,
  date timestamptz not null,
  genre text not null,
  created_at timestamptz not null default now()
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendee_status not null default 'interested',
  looking_for_ride boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.event_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index events_date_idx on public.events (date);
create index events_city_idx on public.events (city);
create index events_genre_idx on public.events (genre);
create index attendees_event_id_idx on public.attendees (event_id);
create index event_posts_event_id_created_at_idx on public.event_posts (event_id, created_at);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendees enable row level security;
alter table public.event_posts enable row level security;

-- Profiles: public read; users edit only their own row
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Events: public read; authenticated users can insert (MVP seed/admin simplicity)
create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Authenticated users can insert events"
  on public.events for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update events"
  on public.events for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Attendees: public read; users manage only their own RSVPs
create policy "Attendees are viewable by everyone"
  on public.attendees for select
  using (true);

create policy "Users can insert own attendee rows"
  on public.attendees for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attendee rows"
  on public.attendees for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own attendee rows"
  on public.attendees for delete
  using (auth.uid() = user_id);

-- Event posts: public read; users manage only their own posts
create policy "Event posts are viewable by everyone"
  on public.event_posts for select
  using (true);

create policy "Users can insert own event posts"
  on public.event_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own event posts"
  on public.event_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own event posts"
  on public.event_posts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime for discussion thread
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.event_posts;

-- ---------------------------------------------------------------------------
-- Seed upcoming rock/metal concerts (Czech Republic)
-- Prefer running 005_czech_events_2026.sql for full details + late-2026 dates.
-- ---------------------------------------------------------------------------
insert into public.events (title, band_name, venue, city, date, genre) values
  ('Club night', 'Mean Messiah', 'Futurum Music Bar', 'Praha', '2026-10-03 20:00:00+02', 'Industrial Metal'),
  ('European Tour 2026', 'Deep Purple', 'O2 arena', 'Praha', '2026-10-07 20:00:00+02', 'Hard Rock'),
  ('In League With Satan Tour', 'Behemoth', 'Hala Vodova', 'Brno', '2026-10-24 19:00:00+02', 'Black Metal'),
  ('5th Album Release Tour', 'Gloryhammer', 'Garage Club', 'Ostrava', '2026-11-05 19:00:00+01', 'Power Metal'),
  ('Dance, Kid, Dance Act II', 'Shinedown', 'Forum Karlín', 'Praha', '2026-11-06 18:30:00+01', 'Hard Rock'),
  ('Euro Tour 2026', 'Korn', 'O2 arena', 'Praha', '2026-11-16 19:30:00+01', 'Nu Metal'),
  ('Rise Of The Roach Tour', 'Papa Roach', 'O2 universum', 'Praha', '2026-11-24 19:00:00+01', 'Nu Metal'),
  ('European Tour 2026', 'Dayseeker', 'Lucerna Music Bar', 'Praha', '2026-12-15 19:00:00+01', 'Post-Hardcore');
