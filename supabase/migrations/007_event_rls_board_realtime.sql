-- P3: Tighten event write RLS + ensure board realtime publication
-- Run after 001–006.

-- Events: public read only from clients. Inserts/updates via service role / SQL.
drop policy if exists "Authenticated users can insert events" on public.events;
drop policy if exists "Authenticated users can update events" on public.events;

-- Optional: allow authenticated insert only when using a privileged claim
-- (kept closed for MVP — seed via SQL / service role).

do $$
begin
  begin
    alter publication supabase_realtime add table public.event_board_posts;
  exception
    when duplicate_object then null;
  end;
end $$;
