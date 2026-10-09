-- P0: Social proof seed + a few late-Sep / early-Oct CZ club nights
-- Run AFTER 005_czech_events_2026.sql
-- Creates demo auth users, profiles, RSVPs, meetups, board posts, chat.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Extra early shows so "Coming up" rail is never empty in late Sep 2026
-- ---------------------------------------------------------------------------
-- Note: follows/band_follows come from 004. If 006 fails on follows, run 004 first
-- (or use 009 which creates those tables if missing).
insert into public.events (
  title, band_name, venue, city, date, genre,
  doors_at, venue_address, ticket_url, price_range, age_restriction,
  support_acts, transit_notes, map_url
) values
(
  'Midweek pit session',
  'Local Heroes Praha',
  'Cross Club',
  'Praha',
  '2026-09-30 20:00:00+02',
  'Hardcore',
  '2026-09-30 19:00:00+02',
  'Plynární 1096/23, Praha 7',
  'https://www.crossclub.cz/',
  '250–350 Kč',
  '18+',
  array['Openers TBA']::text[],
  'Metro C Nádraží Holešovice',
  'https://www.google.com/maps/search/?api=1&query=Cross+Club+Praha'
),
(
  'Brno basement riffs',
  'Kabinet Crew',
  'Kabinet Múz',
  'Brno',
  '2026-10-01 20:00:00+02',
  'Sludge Metal',
  '2026-10-01 19:00:00+02',
  'Sukova 49/4, Brno',
  'https://www.kabinetmuz.cz/',
  '200–300 Kč',
  '18+',
  array[]::text[],
  'Centrum Brno',
  'https://www.google.com/maps/search/?api=1&query=Kabinet+Muz+Brno'
),
(
  'Ostrava club night',
  'Barrák Allstars',
  'Barrák Music Club',
  'Ostrava',
  '2026-10-02 20:00:00+02',
  'Thrash Metal',
  '2026-10-02 19:00:00+02',
  'Českobratrská 20, Ostrava',
  'https://www.barrak.cz/',
  '280–380 Kč',
  '18+',
  array[]::text[],
  'City centre',
  'https://www.google.com/maps/search/?api=1&query=Barrak+Music+Club+Ostrava'
);

-- ---------------------------------------------------------------------------
-- Demo auth users (password: ConcertDemo1! — for local testing only)
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
    {"id":"a8888888-8888-8888-8888-888888888888","email":"brno.ride@demo.cz","username":"brno_wheels","city":"Brno","genres":["Black Metal","Nu Metal","Hard Rock"],"bands":["Behemoth","Korn","Shinedown"],"alone":false,"bio":"Driving Brno→Praha often. 3 seats free if you pitch for petrol."}
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
        (u.value->>'id')::uuid,
        (u.value->>'id')::uuid,
        jsonb_build_object('sub', u.value->>'id', 'email', u.value->>'email'),
        'email',
        u.value->>'id',
        now(),
        now(),
        now()
      );
    end if;

    -- Trigger may have created profile; upsert details
    insert into public.profiles (id, username, city, bio, favorite_genres, favorite_bands, usually_goes_alone)
    values (
      (u.value->>'id')::uuid,
      u.value->>'username',
      u.value->>'city',
      u.value->>'bio',
      array(select jsonb_array_elements_text(u.value->'genres')),
      array(select jsonb_array_elements_text(u.value->'bands')),
      (u.value->>'alone')::boolean
    )
    on conflict (id) do update set
      username = excluded.username,
      city = excluded.city,
      bio = excluded.bio,
      favorite_genres = excluded.favorite_genres,
      favorite_bands = excluded.favorite_bands,
      usually_goes_alone = excluded.usually_goes_alone;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RSVPs tied to band/city taste
-- ---------------------------------------------------------------------------
insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a1111111-1111-1111-1111-111111111111'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Korn', 'Papa Roach', 'Shinedown', 'Local Heroes Praha', 'Mean Messiah')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a2222222-2222-2222-2222-222222222222'::uuid, 'going', true, true, false, false, true, null, null
from public.events e where e.band_name in ('Behemoth', 'The Risen Dread', 'Syridas', 'Kabinet Crew')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a3333333-3333-3333-3333-333333333333'::uuid, 'going', false, false, false, true, true, 'Ostrava', 3
from public.events e where e.band_name in ('Gloryhammer', 'Uriah Heep', 'Korn', 'Barrák Allstars')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a4444444-4444-4444-4444-444444444444'::uuid, 'interested', false, true, true, false, false, 'Zlín', null
from public.events e where e.band_name in ('Beast In Black', 'Eluveitie', 'Gloryhammer', 'Korn')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a5555555-5555-5555-5555-555555555555'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Nazareth', 'Uriah Heep', 'Deep Purple')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a6666666-6666-6666-6666-666666666666'::uuid, 'going', false, true, true, false, true, 'Liberec', null
from public.events e where e.band_name in ('Nazareth', 'Korn')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a7777777-7777-7777-7777-777777777777'::uuid, 'going', true, false, false, false, true, null, null
from public.events e where e.band_name in ('Polyphia', 'Dayseeker', 'Chelsea Wolfe', 'Currents')
on conflict (event_id, user_id) do nothing;

insert into public.attendees (event_id, user_id, status, going_alone, looking_for_company, looking_for_ride, offering_ride, has_tickets, ride_from, ride_seats)
select e.id, 'a8888888-8888-8888-8888-888888888888'::uuid, 'going', false, false, false, true, true, 'Brno', 3
from public.events e where e.band_name in ('Behemoth', 'Korn', 'Shinedown', 'Papa Roach')
on conflict (event_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Follows between demos
-- ---------------------------------------------------------------------------
insert into public.follows (follower_id, following_id) values
  ('a1111111-1111-1111-1111-111111111111', 'a7777777-7777-7777-7777-777777777777'),
  ('a1111111-1111-1111-1111-111111111111', 'a8888888-8888-8888-8888-888888888888'),
  ('a2222222-2222-2222-2222-222222222222', 'a8888888-8888-8888-8888-888888888888'),
  ('a3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111'),
  ('a4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333'),
  ('a6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111'),
  ('a7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111'),
  ('a8888888-8888-8888-8888-888888888888', 'a2222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.band_follows (user_id, band_name) values
  ('a1111111-1111-1111-1111-111111111111', 'Korn'),
  ('a1111111-1111-1111-1111-111111111111', 'Papa Roach'),
  ('a2222222-2222-2222-2222-222222222222', 'Behemoth'),
  ('a3333333-3333-3333-3333-333333333333', 'Gloryhammer'),
  ('a7777777-7777-7777-7777-777777777777', 'Polyphia'),
  ('a8888888-8888-8888-8888-888888888888', 'Shinedown')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Meetups / board / pins / chat on flagship shows
-- ---------------------------------------------------------------------------
insert into public.event_meetups (event_id, user_id, title, location, meetup_at, notes)
select e.id, 'a1111111-1111-1111-1111-111111111111'::uuid,
  'Pre-show beers', 'U Fleků / nearby Karlín pub', e.date - interval '2 hours',
  'Black shirts only half-joking. Look for the crimson tote.'
from public.events e where e.band_name = 'Shinedown' and e.city = 'Praha'
limit 1;

insert into public.event_meetups (event_id, user_id, title, location, meetup_at, notes)
select e.id, 'a8888888-8888-8888-8888-888888888888'::uuid,
  'Carpool meet', 'O2 arena P+R lot', e.date - interval '90 minutes',
  'Brno crew — 3 seats left, petrol split.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_meetups (event_id, user_id, title, location, meetup_at, notes)
select e.id, 'a2222222-2222-2222-2222-222222222222'::uuid,
  'Pit briefing', 'Hala Vodova steps', e.date - interval '45 minutes',
  'Hydrate. Earplugs. No phones in the circle.'
from public.events e where e.band_name = 'Behemoth'
limit 1;

insert into public.event_board_posts (event_id, user_id, side, category, status, title, details)
select e.id, 'a6666666-6666-6666-6666-666666666666'::uuid, 'want', 'ride', 'open',
  'Need ride Liberec → Praha for Korn',
  'Can leave after 15:00, happy to chip in for petrol.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_board_posts (event_id, user_id, side, category, status, title, details)
select e.id, 'a8888888-8888-8888-8888-888888888888'::uuid, 'offer', 'ride', 'open',
  '3 seats Brno → Praha (Korn)',
  'Leaving Brno ~14:30. DM / reply here.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_board_posts (event_id, user_id, side, category, status, title, details)
select e.id, 'a4444444-4444-4444-4444-444444444444'::uuid, 'want', 'company', 'open',
  'Looking for company — first arena show',
  'Usually club-only. Anyone else going alone from Zlín area?'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_pins (event_id, user_id, content)
select e.id, 'a1111111-1111-1111-1111-111111111111'::uuid,
  'Metro B to Českomoravská. Bag check is slow — arrive before doors.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_pins (event_id, user_id, content)
select e.id, 'a2222222-2222-2222-2222-222222222222'::uuid,
  'Hala Vodova: merch line opens early. No backpacks in the pit.'
from public.events e where e.band_name = 'Behemoth'
limit 1;

insert into public.event_posts (event_id, user_id, channel, content)
select e.id, 'a1111111-1111-1111-1111-111111111111'::uuid, 'general',
  'Who else is taking the rail? First time seeing Architects live too.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_posts (event_id, user_id, channel, content)
select e.id, 'a8888888-8888-8888-8888-888888888888'::uuid, 'general',
  'Driving from Brno — seats free, see #looking-for.'
from public.events e where e.band_name = 'Korn'
limit 1;

insert into public.event_posts (event_id, user_id, channel, content)
select e.id, 'a2222222-2222-2222-2222-222222222222'::uuid, 'setlist_pit',
  'Dark Funeral open — expect blast beats before the big circle.'
from public.events e where e.band_name = 'Behemoth'
limit 1;
