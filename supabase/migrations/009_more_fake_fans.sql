-- Extra fake fans, RSVPs, chat, board posts, meetups to fill empty discovery/show gaps.
-- Self-contained for demo auth users (creates a* + b* if missing). Password: ConcertDemo1!
-- Prefer running after 001–005 for events/schema. Creates follows tables if 004 was skipped.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Ensure discovery tables exist (from 004_follows_discovery.sql)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- All demo users (006 cohort a* + 009 cohort b*) — create if missing
-- Password: ConcertDemo1!
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
  demo_users constant jsonb := '[
    {"id":"a1111111-1111-1111-1111-111111111111","email":"pit.praha@demo.cz","username":"pit_praha","city":"Praha","genres":["Nu Metal","Hard Rock","Metalcore"],"bands":["Korn","Papa Roach","Shinedown"],"alone":true,"bio":"Praha pit regular. Usually solo, always early for rail."},
    {"id":"a2222222-2222-2222-2222-222222222222","email":"brno.blast@demo.cz","username":"brno_blast","city":"Brno","genres":["Black Metal","Death Metal","Melodic Death Metal"],"bands":["Behemoth","Dimmu Borgir","Syridas"],"alone":true,"bio":"Brno underground. Melodka is home."},
    {"id":"a3333333-3333-3333-3333-333333333333","email":"ostrava.riff@demo.cz","username":"ostrava_riff","city":"Ostrava","genres":["Power Metal","Hard Rock","Folk Metal"],"bands":["Gloryhammer","Uriah Heep","Eluveitie"],"alone":false,"bio":"From Ostrava with a car — often offering rides to Praha."},
    {"id":"a4444444-4444-4444-4444-444444444444","email":"zlin.hammer@demo.cz","username":"zlin_hammer","city":"Zlín","genres":["Power Metal","Folk Metal","Symphonic Metal"],"bands":["Beast In Black","Eluveitie","Gloryhammer"],"alone":false,"bio":"Zlín scene. Looking for company for arena shows."},
    {"id":"a5555555-5555-5555-5555-555555555555","email":"hradec.heep@demo.cz","username":"hradec_rock","city":"Hradec Králové","genres":["Hard Rock","Classic Rock"],"bands":["Nazareth","Uriah Heep","Deep Purple"],"alone":true,"bio":"Classic rock nights > festivals."},
    {"id":"a6666666-6666-6666-6666-666666666666","email":"liberec.louder@demo.cz","username":"liberec_louder","city":"Liberec","genres":["Hard Rock","Nu Metal"],"bands":["Nazareth","Korn"],"alone":false,"bio":"Train from Liberec when the lineup is worth it."},
    {"id":"a7777777-7777-7777-7777-777777777777","email":"praha.prog@demo.cz","username":"praha_prog","city":"Praha","genres":["Progressive Metal","Post-Hardcore","Doom / Darkwave"],"bands":["Polyphia","Dayseeker","Chelsea Wolfe"],"alone":true,"bio":"Club shows > arenas. Lucerna / ARCHA+ / SaSaZu."},
    {"id":"a8888888-8888-8888-8888-888888888888","email":"brno.ride@demo.cz","username":"brno_wheels","city":"Brno","genres":["Black Metal","Nu Metal","Hard Rock"],"bands":["Behemoth","Korn","Shinedown"],"alone":false,"bio":"Driving Brno→Praha often. 3 seats free if you pitch for petrol."},
    {"id":"b1111111-1111-1111-1111-111111111111","email":"rail.queen@demo.cz","username":"rail_queen","city":"Praha","genres":["Nu Metal","Metalcore","Hard Rock"],"bands":["Korn","Papa Roach","The Devil Wears Prada"],"alone":true,"bio":"Always on the rail. Bring water and earplugs."},
    {"id":"b2222222-2222-2222-2222-222222222222","email":"merch.hawk@demo.cz","username":"merch_hawk","city":"Praha","genres":["Hard Rock","Nu Metal","Pop Punk"],"bands":["Shinedown","Simple Plan","Papa Roach"],"alone":false,"bio":"First in merch line, last out of the venue."},
    {"id":"b3333333-3333-3333-3333-333333333333","email":"pit.medic@demo.cz","username":"pit_medic","city":"Praha","genres":["Hardcore","Metalcore","Death Metal"],"bands":["Currents","The Devil Wears Prada","The Risen Dread"],"alone":false,"bio":"Look for the red cross patch. Happy to pull people up."},
    {"id":"b4444444-4444-4444-4444-444444444444","email":"folk.fiddle@demo.cz","username":"folk_fiddle","city":"Zlín","genres":["Folk Metal","Power Metal","Symphonic Metal"],"bands":["Eluveitie","Gloryhammer","Beast In Black"],"alone":true,"bio":"Zlín → everywhere if there is a hurdy-gurdy."},
    {"id":"b5555555-5555-5555-5555-555555555555","email":"blast.beats@demo.cz","username":"blast_beats","city":"Brno","genres":["Black Metal","Death Metal","Melodic Death Metal"],"bands":["Behemoth","Amon Amarth","Syridas"],"alone":true,"bio":"Melodka nights and Vodova rituals."},
    {"id":"b6666666-6666-6666-6666-666666666666","email":"train.hopper@demo.cz","username":"train_hopper","city":"Hradec Králové","genres":["Hard Rock","Classic Rock","Nu Metal"],"bands":["Nazareth","Deep Purple","Korn"],"alone":false,"bio":"RegioJet / IC when the lineup is worth it."},
    {"id":"b7777777-7777-7777-7777-777777777777","email":"cloakroom.cz@demo.cz","username":"cloakroom_cz","city":"Praha","genres":["Doom / Darkwave","Post-Hardcore","Progressive Metal"],"bands":["Chelsea Wolfe","Dayseeker","Polyphia"],"alone":true,"bio":"Club shows. Soft voice, loud pedals."},
    {"id":"b8888888-8888-8888-8888-888888888888","email":"ticket.swap@demo.cz","username":"ticket_swap","city":"Praha","genres":["Nu Metal","Hard Rock","Metalcore"],"bands":["Korn","Shinedown","Currents"],"alone":false,"bio":"Buy/sell face-value only. No scalpers."},
    {"id":"b9999999-9999-9999-9999-999999999999","email":"ostrava.pit@demo.cz","username":"ostrava_pit","city":"Ostrava","genres":["Thrash Metal","Power Metal","Hard Rock"],"bands":["Gloryhammer","Uriah Heep","Barrák Allstars"],"alone":true,"bio":"Barrák regular. Happy to show visitors the city."},
    {"id":"ba111111-1111-1111-1111-111111111111","email":"plzen.riff@demo.cz","username":"plzen_riff","city":"Plzeň","genres":["Hard Rock","Nu Metal","Industrial Metal"],"bands":["Deep Purple","Korn","Mean Messiah"],"alone":false,"bio":"West Bohemia crew — often carpool to Praha."},
    {"id":"bb222222-2222-2222-2222-222222222222","email":"photo.pit@demo.cz","username":"photo_pit","city":"Praha","genres":["Hard Rock","Nu Metal","Folk Metal"],"bands":["Shinedown","Papa Roach","Eluveitie"],"alone":false,"bio":"Phone pics only — no pro rig in the pit."},
    {"id":"bc333333-3333-3333-3333-333333333333","email":"newbie.metal@demo.cz","username":"newbie_metal","city":"Praha","genres":["Nu Metal","Pop Punk","Hard Rock"],"bands":["Simple Plan","Korn","The Pretty Reckless"],"alone":true,"bio":"First year of shows. Looking for friendly company."}
  ]'::jsonb;
begin
  for u in select * from jsonb_array_elements(demo_users)
  loop
    if not exists (select 1 from auth.users where id = (u.value->>'id')::uuid) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        (u.value->>'id')::uuid,
        'authenticated',
        'authenticated',
        u.value->>'email',
        crypt('ConcertDemo1!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', u.value->>'username'),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        (u.value->>'id')::uuid,
        jsonb_build_object('sub', u.value->>'id', 'email', u.value->>'email'),
        'email',
        u.value->>'id',
        now(),
        now(),
        now()
      );
    end if;

    insert into public.profiles (
      id, username, city, bio, favorite_genres, favorite_bands, usually_goes_alone, avatar_url
    ) values (
      (u.value->>'id')::uuid,
      u.value->>'username',
      u.value->>'city',
      u.value->>'bio',
      array(select jsonb_array_elements_text(u.value->'genres')),
      array(select jsonb_array_elements_text(u.value->'bands')),
      (u.value->>'alone')::boolean,
      'https://api.dicebear.com/9.x/lorelei/svg?seed=' || (u.value->>'username') || '&backgroundColor=1c1917'
    )
    on conflict (id) do update set
      username = excluded.username,
      city = excluded.city,
      bio = excluded.bio,
      favorite_genres = excluded.favorite_genres,
      favorite_bands = excluded.favorite_bands,
      usually_goes_alone = excluded.usually_goes_alone,
      avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RSVPs — spread across more shows so social proof isn't thin
-- ---------------------------------------------------------------------------
insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b1111111-1111-1111-1111-111111111111'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Korn', 'Papa Roach', 'The Devil Wears Prada', 'Local Heroes Praha')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b2222222-2222-2222-2222-222222222222'::uuid, 'going', false, true, false, false, true, null, null
from public.events e where e.band_name in ('Shinedown', 'Simple Plan', 'Papa Roach', 'Korn')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b3333333-3333-3333-3333-333333333333'::uuid, 'going', false, false, false, false, true, null, null
from public.events e where e.band_name in ('Currents', 'The Devil Wears Prada', 'The Risen Dread', 'Dayseeker')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b4444444-4444-4444-4444-444444444444'::uuid, 'going', true, true, true, false, true, 'Zlín', null
from public.events e where e.band_name in ('Eluveitie', 'Gloryhammer', 'Beast In Black')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b5555555-5555-5555-5555-555555555555'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Behemoth', 'Amon Amarth', 'Syridas', 'Kabinet Crew')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b6666666-6666-6666-6666-666666666666'::uuid, 'going', false, true, true, false, true, 'Hradec Králové', null
from public.events e where e.band_name in ('Nazareth', 'Deep Purple', 'Korn')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b7777777-7777-7777-7777-777777777777'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Chelsea Wolfe', 'Dayseeker', 'Polyphia', 'Currents')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b8888888-8888-8888-8888-888888888888'::uuid, 'interested', false, false, false, false, false, null, null
from public.events e where e.band_name in ('Korn', 'Shinedown', 'Currents', 'The Pretty Reckless')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'b9999999-9999-9999-9999-999999999999'::uuid, 'going', true, true, false, false, true, null, null
from public.events e where e.band_name in ('Gloryhammer', 'Uriah Heep', 'Barrák Allstars')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'ba111111-1111-1111-1111-111111111111'::uuid, 'going', false, false, false, true, true, 'Plzeň', 2
from public.events e where e.band_name in ('Deep Purple', 'Korn', 'Mean Messiah')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'bb222222-2222-2222-2222-222222222222'::uuid, 'going', false, true, false, false, true, null, null
from public.events e where e.band_name in ('Shinedown', 'Papa Roach', 'Eluveitie', 'Amon Amarth')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'bc333333-3333-3333-3333-333333333333'::uuid, 'going', true, true, false, false, true, null, null
from public.events e where e.band_name in ('Simple Plan', 'Korn', 'The Pretty Reckless', 'Local Heroes Praha')
on conflict (event_id, user_id) do nothing;

-- Interested-only filler on quieter shows
insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets)
select e.id, u.id, 'interested', false, false, false, false, false
from public.events e
cross join (
  values
    ('b2222222-2222-2222-2222-222222222222'::uuid),
    ('b8888888-8888-8888-8888-888888888888'::uuid),
    ('bc333333-3333-3333-3333-333333333333'::uuid)
) as u(id)
where e.band_name in ('Hämatom', 'Mean Messiah', 'Chelsea Wolfe', 'Polyphia')
on conflict (event_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Follow graph (People / scene rails) — only when both profiles exist
-- ---------------------------------------------------------------------------
insert into public.follows (follower_id, following_id)
select v.follower_id, v.following_id
from (
  values
    ('b1111111-1111-1111-1111-111111111111'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('b1111111-1111-1111-1111-111111111111'::uuid, 'b3333333-3333-3333-3333-333333333333'::uuid),
    ('b2222222-2222-2222-2222-222222222222'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('b2222222-2222-2222-2222-222222222222'::uuid, 'bb222222-2222-2222-2222-222222222222'::uuid),
    ('b3333333-3333-3333-3333-333333333333'::uuid, 'a7777777-7777-7777-7777-777777777777'::uuid),
    ('b4444444-4444-4444-4444-444444444444'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid),
    ('b5555555-5555-5555-5555-555555555555'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid),
    ('b5555555-5555-5555-5555-555555555555'::uuid, 'a8888888-8888-8888-8888-888888888888'::uuid),
    ('b6666666-6666-6666-6666-666666666666'::uuid, 'a5555555-5555-5555-5555-555555555555'::uuid),
    ('b7777777-7777-7777-7777-777777777777'::uuid, 'a7777777-7777-7777-7777-777777777777'::uuid),
    ('b8888888-8888-8888-8888-888888888888'::uuid, 'b1111111-1111-1111-1111-111111111111'::uuid),
    ('b9999999-9999-9999-9999-999999999999'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid),
    ('ba111111-1111-1111-1111-111111111111'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('bb222222-2222-2222-2222-222222222222'::uuid, 'b2222222-2222-2222-2222-222222222222'::uuid),
    ('bc333333-3333-3333-3333-333333333333'::uuid, 'b1111111-1111-1111-1111-111111111111'::uuid),
    ('bc333333-3333-3333-3333-333333333333'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'b1111111-1111-1111-1111-111111111111'::uuid),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'b2222222-2222-2222-2222-222222222222'::uuid),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'a7777777-7777-7777-7777-777777777777'::uuid),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'a8888888-8888-8888-8888-888888888888'::uuid),
    ('a2222222-2222-2222-2222-222222222222'::uuid, 'a8888888-8888-8888-8888-888888888888'::uuid),
    ('a3333333-3333-3333-3333-333333333333'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('a4444444-4444-4444-4444-444444444444'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid),
    ('a6666666-6666-6666-6666-666666666666'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('a7777777-7777-7777-7777-777777777777'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
    ('a8888888-8888-8888-8888-888888888888'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid)
) as v(follower_id, following_id)
where exists (select 1 from public.profiles p where p.id = v.follower_id)
  and exists (select 1 from public.profiles p where p.id = v.following_id)
on conflict do nothing;

insert into public.band_follows (user_id, band_name)
select v.user_id, v.band_name
from (
  values
    ('b1111111-1111-1111-1111-111111111111'::uuid, 'Korn'),
    ('b2222222-2222-2222-2222-222222222222'::uuid, 'Shinedown'),
    ('b3333333-3333-3333-3333-333333333333'::uuid, 'Currents'),
    ('b4444444-4444-4444-4444-444444444444'::uuid, 'Eluveitie'),
    ('b5555555-5555-5555-5555-555555555555'::uuid, 'Behemoth'),
    ('b5555555-5555-5555-5555-555555555555'::uuid, 'Amon Amarth'),
    ('b7777777-7777-7777-7777-777777777777'::uuid, 'Chelsea Wolfe'),
    ('bc333333-3333-3333-3333-333333333333'::uuid, 'Simple Plan'),
    ('ba111111-1111-1111-1111-111111111111'::uuid, 'Deep Purple'),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'Korn'),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'Papa Roach'),
    ('a2222222-2222-2222-2222-222222222222'::uuid, 'Behemoth'),
    ('a3333333-3333-3333-3333-333333333333'::uuid, 'Gloryhammer'),
    ('a7777777-7777-7777-7777-777777777777'::uuid, 'Polyphia'),
    ('a8888888-8888-8888-8888-888888888888'::uuid, 'Shinedown')
) as v(user_id, band_name)
where exists (select 1 from public.profiles p where p.id = v.user_id)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Chat (#general + #setlist-pit) on flagship + club shows
-- ---------------------------------------------------------------------------
insert into public.event_posts (event_id, user_id, channel, content)
select e.id, p.user_id, p.channel::public.event_chat_channel, p.content
from public.events e
join (
  values
    ('Korn', 'b1111111-1111-1111-1111-111111111111'::uuid, 'general', 'Rail crew meet at doors — black shirts, crimson tote.'),
    ('Korn', 'b2222222-2222-2222-2222-222222222222'::uuid, 'general', 'Merch prices last tour were brutal. Anyone know if VIP early entry is worth it?'),
    ('Korn', 'bc333333-3333-3333-3333-333333333333'::uuid, 'general', 'First arena show ever — any tips for not getting crushed?'),
    ('Korn', 'ba111111-1111-1111-1111-111111111111'::uuid, 'general', 'Leaving Plzeň ~15:00 with 2 seats. Reply if you need a lift.'),
    ('Korn', 'b6666666-6666-6666-6666-666666666666'::uuid, 'general', 'Train from Hradec lands ~17:40. Anyone walking from Českomoravská together?'),
    ('Korn', 'b1111111-1111-1111-1111-111111111111'::uuid, 'setlist_pit', 'Calling Blind / Freak on a Leash / Falling Away From Me — pit opens early.'),
    ('Korn', 'b3333333-3333-3333-3333-333333333333'::uuid, 'setlist_pit', 'Architects support — expect a push before Korn. Stay hydrated.'),
    ('Shinedown', 'b2222222-2222-2222-2222-222222222222'::uuid, 'general', 'Forum Karlín sightlines are solid from the floor mid-left.'),
    ('Shinedown', 'bb222222-2222-2222-2222-222222222222'::uuid, 'general', 'Who else is filming Second Chance? Trying not to block anyone.'),
    ('Shinedown', 'a1111111-1111-1111-1111-111111111111'::uuid, 'setlist_pit', 'Monsters / Cut the Cord / Sound of Madness — classic night.'),
    ('Behemoth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'general', 'Coming from Melodka energy — Vodova will feel huge.'),
    ('Behemoth', 'a2222222-2222-2222-2222-222222222222'::uuid, 'general', 'Anyone got earplugs to spare? Mine died at the last blast.'),
    ('Behemoth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'setlist_pit', 'Ora Pro Nobis Lucifer into Blow Your Trumpets Gabriel — circle opens.'),
    ('Papa Roach', 'b1111111-1111-1111-1111-111111111111'::uuid, 'general', 'Last Resort still hits. Who is crowd-surfing responsibly?'),
    ('Papa Roach', 'b2222222-2222-2222-2222-222222222222'::uuid, 'general', 'Universum cloakroom fills fast — travel light.'),
    ('Deep Purple', 'ba111111-1111-1111-1111-111111111111'::uuid, 'general', 'Classic rock night. Seated? Standing? I am standing.'),
    ('Deep Purple', 'b6666666-6666-6666-6666-666666666666'::uuid, 'general', 'Smoke on the Water encore bet — who is in?'),
    ('Polyphia', 'b7777777-7777-7777-7777-777777777777'::uuid, 'general', 'SaSaZu for tech shred — standing room only vibes.'),
    ('Polyphia', 'a7777777-7777-7777-7777-777777777777'::uuid, 'setlist_pit', 'Playing God / ABC — phones up for the tapping section.'),
    ('Dayseeker', 'b7777777-7777-7777-7777-777777777777'::uuid, 'general', 'Lucerna basement will be emotional. Bring tissues half-joking.'),
    ('Chelsea Wolfe', 'b7777777-7777-7777-7777-777777777777'::uuid, 'general', 'ARCHA+ is perfect for this. Quiet before the drones.'),
    ('Simple Plan', 'bc333333-3333-3333-3333-333333333333'::uuid, 'general', 'Nostalgia night. Looking for other first-timers.'),
    ('Simple Plan', 'b2222222-2222-2222-2222-222222222222'::uuid, 'general', 'Universum again — same drill as Papa Roach.'),
    ('Gloryhammer', 'b4444444-4444-4444-4444-444444444444'::uuid, 'general', 'Garage Club Ostrava — tiny room, huge fantasy.'),
    ('Gloryhammer', 'b9999999-9999-9999-9999-999999999999'::uuid, 'general', 'Local tip: arrive early, merch sells out.'),
    ('Eluveitie', 'b4444444-4444-4444-4444-444444444444'::uuid, 'general', 'Folk metal in Zlín — who is bringing the flags?'),
    ('Amon Amarth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'general', 'Vikings at Universum. Horns up.'),
    ('Amon Amarth', 'bb222222-2222-2222-2222-222222222222'::uuid, 'setlist_pit', 'Twilight of the Thunder God — circle of death warning.'),
    ('Local Heroes Praha', 'bc333333-3333-3333-3333-333333333333'::uuid, 'general', 'Cross Club midweek — perfect warm-up show.'),
    ('Local Heroes Praha', 'b1111111-1111-1111-1111-111111111111'::uuid, 'general', 'Support TBA but the room always rips.'),
    ('Mean Messiah', 'ba111111-1111-1111-1111-111111111111'::uuid, 'general', 'Futurum industrial night. Smíchov afterparty?'),
    ('The Pretty Reckless', 'bc333333-3333-3333-3333-333333333333'::uuid, 'general', 'Going alone — anyone want to meet at Invalidovna?'),
    ('Currents', 'b3333333-3333-3333-3333-333333333333'::uuid, 'general', 'Lucerna pit etiquette: help people up, no glass.'),
    ('Currents', 'b7777777-7777-7777-7777-777777777777'::uuid, 'setlist_pit', 'Remember Me / Monsters — expect a hard push.'),
    ('Nazareth', 'b6666666-6666-6666-6666-666666666666'::uuid, 'general', 'Aldis classic rock — seats are fine, energy is better standing if allowed.'),
    ('Uriah Heep', 'b9999999-9999-9999-9999-999999999999'::uuid, 'general', 'GONG industrial vibe rules. Photo ops outside before doors.')
) as p(band_name, user_id, channel, content)
  on e.band_name = p.band_name
where not exists (
  select 1 from public.event_posts ep
  where ep.event_id = e.id and ep.user_id = p.user_id and ep.content = p.content
);

-- ---------------------------------------------------------------------------
-- Looking-for board filler
-- ---------------------------------------------------------------------------
insert into public.event_board_posts (event_id, user_id, side, category, status, title, details)
select e.id, p.user_id, p.side::public.board_side, p.category::public.board_category, 'open', p.title, p.details
from public.events e
join (
  values
    ('Korn', 'ba111111-1111-1111-1111-111111111111'::uuid, 'offer', 'ride', '2 seats Plzeň → Praha', 'Leaving 15:00, return night-of if energy allows.'),
    ('Korn', 'b8888888-8888-8888-8888-888888888888'::uuid, 'offer', 'ticket', '1× GA face value', 'Can''t make it after all. Prefer handover at Českomoravská.'),
    ('Korn', 'bc333333-3333-3333-3333-333333333333'::uuid, 'want', 'company', 'Newbie looking for pit buddies', 'Never done an arena. Prefer chill people near the back of the pit.'),
    ('Shinedown', 'b2222222-2222-2222-2222-222222222222'::uuid, 'want', 'merch', 'XL tour tee', 'Missed last drop — anyone sizing up?'),
    ('Shinedown', 'bb222222-2222-2222-2222-222222222222'::uuid, 'want', 'company', 'Floor friends?', 'Going with one friend, happy to meet more before doors.'),
    ('Behemoth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'want', 'ticket', 'Need 1× standing', 'Sold out online — face value only.'),
    ('Papa Roach', 'b1111111-1111-1111-1111-111111111111'::uuid, 'offer', 'company', 'Rail early crew', 'Meet 60 min before doors. Hydration check.'),
    ('Deep Purple', 'ba111111-1111-1111-1111-111111111111'::uuid, 'offer', 'ride', 'Plzeň carpool', '2 seats, petrol split.'),
    ('Eluveitie', 'b4444444-4444-4444-4444-444444444444'::uuid, 'want', 'ride', 'Ride to Zlín hall', 'Can meet in Otrokovice / Zlín station.'),
    ('Simple Plan', 'bc333333-3333-3333-3333-333333333333'::uuid, 'want', 'company', 'First Universum show', 'Nervous but hyped. Coffee before doors?'),
    ('Polyphia', 'b7777777-7777-7777-7777-777777777777'::uuid, 'offer', 'other', 'Earplug extras', 'Foam pair free if you need them at SaSaZu.'),
    ('Local Heroes Praha', 'b3333333-3333-3333-3333-333333333333'::uuid, 'offer', 'company', 'Cross Club hang', 'Beer before doors at the courtyard.')
) as p(band_name, user_id, side, category, title, details)
  on e.band_name = p.band_name
where not exists (
  select 1 from public.event_board_posts bp
  where bp.event_id = e.id and bp.user_id = p.user_id and bp.title = p.title
);

-- ---------------------------------------------------------------------------
-- Meetups + pins
-- ---------------------------------------------------------------------------
insert into public.event_meetups (event_id, user_id, title, location, meetup_at, notes)
select e.id, p.user_id, p.title, p.location, e.date - p.hours_before * interval '1 hour', p.notes
from public.events e
join (
  values
    ('Korn', 'b1111111-1111-1111-1111-111111111111'::uuid, 'Rail early', 'O2 arena main entrance', 1.5, 'Black / crimson. No glass bottles.'),
    ('Korn', 'bc333333-3333-3333-3333-333333333333'::uuid, 'Newbie hang', 'Českomoravská metro exit', 2, 'Coffee then walk over together.'),
    ('Shinedown', 'b2222222-2222-2222-2222-222222222222'::uuid, 'Merch sprint', 'Forum Karlín foyer', 1, 'Queue for tour tee then floor.'),
    ('Papa Roach', 'bb222222-2222-2222-2222-222222222222'::uuid, 'Photo meet', 'Universum plaza', 1.25, 'Group pic before bag check.'),
    ('Behemoth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'Pre-ritual', 'Vodova tram stop', 1, 'Earplugs in. Phones away.'),
    ('Deep Purple', 'ba111111-1111-1111-1111-111111111111'::uuid, 'Classic rock crew', 'Arena west entrance', 1, 'Plzeň car arrives ~18:30.'),
    ('Simple Plan', 'bc333333-3333-3333-3333-333333333333'::uuid, 'Nostalgia circle', 'Universum steps', 1, 'Singalong warm-up optional.'),
    ('Polyphia', 'b7777777-7777-7777-7777-777777777777'::uuid, 'Quiet before shred', 'SaSaZu bar', 0.75, 'One drink, then floor.')
) as p(band_name, user_id, title, location, hours_before, notes)
  on e.band_name = p.band_name
where not exists (
  select 1 from public.event_meetups m
  where m.event_id = e.id and m.user_id = p.user_id and m.title = p.title
);

insert into public.event_pins (event_id, user_id, content)
select e.id, p.user_id, p.content
from public.events e
join (
  values
    ('Korn', 'b2222222-2222-2222-2222-222222222222'::uuid, 'Bag check + water refill near cloakroom. Cashless merch usually works.'),
    ('Shinedown', 'bb222222-2222-2222-2222-222222222222'::uuid, 'Forum Karlín: Invalidovna exit is quieter than Křižíkova after show.'),
    ('Papa Roach', 'b1111111-1111-1111-1111-111111111111'::uuid, 'Universum and O2 arena share the metro stop — follow Universum signs.'),
    ('Behemoth', 'b5555555-5555-5555-5555-555555555555'::uuid, 'No backpacks in the pit. Hydration station near toilets.'),
    ('Deep Purple', 'ba111111-1111-1111-1111-111111111111'::uuid, 'Parking P+R fills early for classic rock nights.'),
    ('Polyphia', 'b7777777-7777-7777-7777-777777777777'::uuid, 'SaSaZu: Vltavská metro + 8 min walk. Earplugs strongly recommended.'),
    ('Local Heroes Praha', 'b3333333-3333-3333-3333-333333333333'::uuid, 'Cross Club cash bar. Coat check is cheap — use it.')
) as p(band_name, user_id, content)
  on e.band_name = p.band_name
where not exists (
  select 1 from public.event_pins pin
  where pin.event_id = e.id and pin.user_id = p.user_id and pin.content = p.content
);

-- ---------------------------------------------------------------------------
-- Sample notifications for a few demos (Activity badge)
-- ---------------------------------------------------------------------------
insert into public.notifications (user_id, type, title, body, href, read)
select v.user_id, v.type, v.title, v.body, v.href, false
from (
  values
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'meetup', 'New meetup on Korn', 'Newbie hang at Českomoravská', '/events'),
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'board', 'Ride offer on Korn', '2 seats Plzeň → Praha', '/events'),
    ('a2222222-2222-2222-2222-222222222222'::uuid, 'chat', 'New #setlist-pit on Behemoth', 'Ora Pro Nobis Lucifer…', '/events'),
    ('b1111111-1111-1111-1111-111111111111'::uuid, 'meetup', 'Merch sprint — Shinedown', 'Forum Karlín foyer', '/events'),
    ('bc333333-3333-3333-3333-333333333333'::uuid, 'board', 'Someone offered company on Korn', 'Rail early crew', '/events')
) as v(user_id, type, title, body, href)
where exists (select 1 from public.profiles p where p.id = v.user_id)
  and not exists (
    select 1 from public.notifications n
    where n.user_id = v.user_id and n.title = v.title and n.body = v.body
  );

-- Point notification hrefs at real event ids where possible
update public.notifications n
set href = '/events/' || e.id || '?channel=looking-for'
from public.events e
where n.body ilike '%Korn%' and e.band_name = 'Korn' and n.href = '/events';

update public.notifications n
set href = '/events/' || e.id || '?channel=setlist-pit'
from public.events e
where n.body ilike '%Behemoth%' and e.band_name = 'Behemoth' and n.href = '/events';

update public.notifications n
set href = '/events/' || e.id || '?channel=meetups'
from public.events e
where n.title ilike '%Shinedown%' and e.band_name = 'Shinedown' and n.href = '/events';
