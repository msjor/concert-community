# Concert Community PWA

Find rock/metal shows near you (CZ-focused), follow fans and bands, and dive into Discord-style show channels.

## Setup

1. **Env vars** — copy `.env.local.example` to `.env.local` (anon/publishable key only — never `sb_secret_` in the browser).

2. **Database** — run in order in the Supabase SQL Editor:

   1. `supabase/migrations/001_initial_schema.sql`
   2. `supabase/migrations/002_community_features.sql`
   3. `supabase/migrations/003_event_channels.sql`
   4. `supabase/migrations/004_follows_discovery.sql`
   5. `supabase/migrations/005_czech_events_2026.sql` — CZ rock/metal shows (Oct–Dec 2026)
   6. `supabase/migrations/006_social_seed_cz.sql` — demo fans, RSVPs, meetups, board posts
   7. `supabase/migrations/007_event_rls_board_realtime.sql` — tighten event writes + board realtime
   8. `supabase/migrations/008_event_images.sql` — band artwork URLs (optional; app has built-in fallbacks)
   9. `supabase/migrations/009_more_fake_fans.sql` — +12 fans, chat, board, meetups, notifications
   10. `supabase/migrations/010_board_threads_profile.sql` — looking-for threads, profile chips, avatar bucket

3. **Auth redirect** — Site URL `http://localhost:3000`, redirect `http://localhost:3000/auth/callback`

4. `npm run dev`

### Demo accounts (after 006 + 009)

Password for all: `ConcertDemo1!`

| Email | Username | City |
|-------|----------|------|
| pit.praha@demo.cz | pit_praha | Praha |
| brno.blast@demo.cz | brno_blast | Brno |
| ostrava.riff@demo.cz | ostrava_riff | Ostrava |
| rail.queen@demo.cz | rail_queen | Praha |
| newbie.metal@demo.cz | newbie_metal | Praha |
| blast.beats@demo.cz | blast_beats | Brno |
| plzen.riff@demo.cz | plzen_riff | Plzeň |

(See `009_more_fake_fans.sql` for the full list of ~20 demos.)

## Surfaces

| Route | Role |
|-------|------|
| `/` | Discovery home (near you, next 14 days, alone, rides, for you, scene, fans) |
| `/explore` | Search + filters |
| `/calendar` | Month list of upcoming shows |
| `/venues/[venue]` | Venue hub |
| `/people` | Find / follow fans |
| `/u/[username]` | Public profile |
| `/activity` | Scene pulse + friend RSVPs + notifications |
| `/events/[id]` | Discord-style show server |
| `/cities/[city]` | City hub |
| `/profile` | Edit your profile |

## Features

- CZ onboarding (city + genres) + EN/CS locale toggle
- City-aware discovery (profile + sticky cookie)
- Follow users and bands; activity badge for unread notifications
- Show surfaces: About, Going, Chat, and Looking for (pinned board posts, each with its own thread)
- RSVP intents (incl. Interested on cards), meetups, board (realtime), chat (realtime)
- Band artwork on cards/show pages (iTunes Search artwork; refresh with `node scripts/fetch-band-images.mjs`)
- Mobile sticky RSVP + attendees sheet on show pages

## Import CSV (stub)

```bash
npx tsx scripts/import-events-csv.ts ./data/shows.csv
```

Parses a simple CSV; service-role upsert is left for when you have a real feed. Prefer SQL seeds for local demos.

## PWA

`npm run build && npm start`, then Add to Home Screen (manifest + icons under `/public`).
