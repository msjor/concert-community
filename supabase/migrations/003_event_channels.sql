-- Discord-style show channels (run after 001 + 002)
-- Channels are fixed per event in the app; this migration adds channel-scoped chat,
-- pins for #info, and a typed #looking-for board.

-- ---------------------------------------------------------------------------
-- Chat channels on event_posts (general + setlist-pit; legacy rows → general)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.event_chat_channel as enum ('general', 'setlist_pit');
exception
  when duplicate_object then null;
end $$;

alter table public.event_posts
  add column if not exists channel public.event_chat_channel not null default 'general';

create index if not exists event_posts_event_channel_created_at_idx
  on public.event_posts (event_id, channel, created_at);

-- ---------------------------------------------------------------------------
-- #info community pins / tips
-- ---------------------------------------------------------------------------
create table if not exists public.event_pins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists event_pins_event_id_idx
  on public.event_pins (event_id, created_at desc);

alter table public.event_pins enable row level security;

drop policy if exists "Event pins are viewable by everyone" on public.event_pins;
create policy "Event pins are viewable by everyone"
  on public.event_pins for select using (true);

drop policy if exists "Users can insert own pins" on public.event_pins;
create policy "Users can insert own pins"
  on public.event_pins for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pins" on public.event_pins;
create policy "Users can delete own pins"
  on public.event_pins for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- #looking-for board
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.board_side as enum ('want', 'offer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.board_category as enum ('company', 'ticket', 'ride', 'merch', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.board_status as enum ('open', 'claimed', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists public.event_board_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side public.board_side not null,
  category public.board_category not null,
  status public.board_status not null default 'open',
  title text not null check (char_length(trim(title)) > 0),
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_board_posts_event_status_idx
  on public.event_board_posts (event_id, status, created_at desc);

alter table public.event_board_posts enable row level security;

drop policy if exists "Board posts are viewable by everyone" on public.event_board_posts;
create policy "Board posts are viewable by everyone"
  on public.event_board_posts for select using (true);

drop policy if exists "Users can insert own board posts" on public.event_board_posts;
create policy "Users can insert own board posts"
  on public.event_board_posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own board posts" on public.event_board_posts;
create policy "Users can update own board posts"
  on public.event_board_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own board posts" on public.event_board_posts;
create policy "Users can delete own board posts"
  on public.event_board_posts for delete using (auth.uid() = user_id);

-- Notify RSVPs when a board post is created
create or replace function public.notify_event_board_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, href)
  select
    a.user_id,
    'event_board',
    case new.side
      when 'want' then 'Looking for: ' || new.title
      else 'Offering: ' || new.title
    end,
    new.category::text,
    '/events/' || new.event_id::text || '?channel=looking-for'
  from public.attendees a
  where a.event_id = new.event_id
    and a.user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists on_event_board_post_notify on public.event_board_posts;
create trigger on_event_board_post_notify
  after insert on public.event_board_posts
  for each row execute function public.notify_event_board_post();

-- Point existing chat/meetup notification links at channels
create or replace function public.notify_event_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  channel_slug text;
begin
  channel_slug := case new.channel
    when 'setlist_pit' then 'setlist-pit'
    else 'general'
  end;

  insert into public.notifications (user_id, type, title, body, href)
  select
    a.user_id,
    'event_post',
    'New message in #' || channel_slug,
    left(new.content, 120),
    '/events/' || new.event_id::text || '?channel=' || channel_slug
  from public.attendees a
  where a.event_id = new.event_id
    and a.user_id <> new.user_id;
  return new;
end;
$$;

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
    '/events/' || new.event_id::text || '?channel=meetups'
  from public.attendees a
  where a.event_id = new.event_id
    and a.user_id <> new.user_id;
  return new;
end;
$$;

-- Realtime for board + pins (chat already published)
do $$ begin
  alter publication supabase_realtime add table public.event_board_posts;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.event_pins;
exception when duplicate_object then null;
end $$;
