-- Community features upgrade (run after 001_initial_schema.sql)
-- Supabase SQL Editor → paste and run this entire file.

-- ---------------------------------------------------------------------------
-- Profiles: matching / hometown
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists city text,
  add column if not exists usually_goes_alone boolean not null default false,
  add column if not exists favorite_bands text[] default '{}';

-- ---------------------------------------------------------------------------
-- Events: practical show info
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists doors_at timestamptz,
  add column if not exists venue_address text,
  add column if not exists ticket_url text,
  add column if not exists price_range text,
  add column if not exists age_restriction text,
  add column if not exists support_acts text[] default '{}',
  add column if not exists transit_notes text,
  add column if not exists map_url text;

-- ---------------------------------------------------------------------------
-- Attendees: intent tags + privacy
-- ---------------------------------------------------------------------------
alter table public.attendees
  add column if not exists looking_for_company boolean not null default false,
  add column if not exists has_tickets boolean not null default false,
  add column if not exists offering_ride boolean not null default false,
  add column if not exists ride_from text,
  add column if not exists ride_seats integer check (ride_seats is null or ride_seats >= 0),
  add column if not exists going_alone boolean not null default false,
  add column if not exists hide_name boolean not null default false;

create index if not exists attendees_going_alone_idx
  on public.attendees (event_id)
  where going_alone = true and status = 'going';

-- ---------------------------------------------------------------------------
-- Event meetups (pre-show / afterparty)
-- ---------------------------------------------------------------------------
create table if not exists public.event_meetups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  location text not null check (char_length(trim(location)) > 0),
  meetup_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists event_meetups_event_id_idx
  on public.event_meetups (event_id, meetup_at);

alter table public.event_meetups enable row level security;

create policy "Event meetups are viewable by everyone"
  on public.event_meetups for select
  using (true);

create policy "Users can insert own meetups"
  on public.event_meetups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meetups"
  on public.event_meetups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own meetups"
  on public.event_meetups for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- In-app notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notify other RSVPs when someone posts on an event they're attending/interested in
create or replace function public.notify_event_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, href)
  select
    a.user_id,
    'event_post',
    'New discussion on a show you follow',
    left(new.content, 120),
    '/events/' || new.event_id::text
  from public.attendees a
  where a.event_id = new.event_id
    and a.user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists on_event_post_notify on public.event_posts;
create trigger on_event_post_notify
  after insert on public.event_posts
  for each row execute function public.notify_event_post();

-- Notify other RSVPs when a meetup is created
create or replace function public.notify_event_meetup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, href)
  select
    a.user_id,
    'event_meetup',
    'New meetup: ' || new.title,
    new.location,
    '/events/' || new.event_id::text
  from public.attendees a
  where a.event_id = new.event_id
    and a.user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists on_event_meetup_notify on public.event_meetups;
create trigger on_event_meetup_notify
  after insert on public.event_meetups
  for each row execute function public.notify_event_meetup();

-- ---------------------------------------------------------------------------
-- Enrich seed events with practical info
-- ---------------------------------------------------------------------------
update public.events set
  doors_at = date - interval '90 minutes',
  venue_address = case city
    when 'Berlin' then 'Mercedes-Platz 1, 10243 Berlin'
    when 'Munich' then 'Spiridon-Louis-Ring 21, 80809 München'
    when 'Cologne' then 'Rheinlandhalle, 50679 Köln'
    when 'Paris' then '211 Avenue Jean Jaurès, 75019 Paris'
    when 'Manchester' then 'Hunt''s Bank, Manchester M3 1AR'
    when 'Stockholm' then 'Globentorget 2, 121 77 Johanneshov'
    when 'London' then '9-11 Highgate Rd, London NW5 1JY'
    else venue || ', ' || city
  end,
  ticket_url = 'https://example.com/tickets/' || id::text,
  price_range = case
    when genre ilike '%punk%' then '€15–25'
    when genre ilike '%symphonic%' then '€45–85'
    else '€35–65'
  end,
  age_restriction = case
    when genre ilike '%punk%' then '16+'
    else '18+'
  end,
  support_acts = case band_name
    when 'Metallica' then array['Epica']
    when 'Gojira' then array['Mastodon']
    when 'Slipknot' then array['Knocked Loose']
    when 'Killswitch Engage' then array['As I Lay Dying']
    else array[]::text[]
  end,
  transit_notes = case city
    when 'Berlin' then 'S-Bahn Warschauer Straße · limited parking'
    when 'London' then 'Kentish Town station · avoid driving'
    when 'Paris' then 'Métro Porte de Pantin'
    else 'Check local transit; rides often posted in RSVP'
  end,
  map_url = 'https://www.google.com/maps/search/?api=1&query=' ||
    replace(venue || ' ' || city, ' ', '+')
where doors_at is null;
