-- WrongTrain database setup.
--
-- Paste this whole file into the Supabase SQL Editor and press Run. It is safe to run again:
-- every statement replaces what it creates.
--
-- One row per shared trip holds the whole trip as JSON, with a version number that goes up on
-- every save. Phones save with the version they last saw; if someone else saved in between, the
-- save is refused and the phone merges the two before trying again, so nobody's edits are lost.
--
-- Who can do what is enforced here, in the database, not in the app:
--   - only people on a trip can read it or change it
--   - only the trip's owner can delete it, remove other people, change roles or set the trip rule
--   - joining needs an invite code from someone already on the trip
--   - under the trip rule (open, approve or all), changes that need the owner's OK are refused
--     by save_trip and go in as requests instead, which an owner or organizer approves or denies

-- ---------- tables ----------

create table if not exists public.trips (
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  data        jsonb not null,
  version     bigint not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
-- How much say people get when they join (chosen when the trip is made; each person's level can
-- be changed after): open, they change anything (editor); approve, they add ideas and plan
-- changes are requests (contributor); look, they read and leave notes (viewer). 'all' is from
-- before levels were per person and counts as approve. See src/model/rules.ts.
alter table public.trips add column if not exists rule text not null default 'open';
alter table public.trips alter column rule set default 'open';
alter table public.trips drop constraint if exists trips_rule_check;
alter table public.trips add constraint trips_rule_check check (rule in ('open', 'approve', 'all', 'look'));

create table if not exists public.trip_members (
  trip_id    text not null references public.trips (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'editor',
  joined_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user on public.trip_members (user_id);
-- owner: one per trip; organizer: changes anything and decides requests; editor: changes anything;
-- contributor: adds ideas, places, to-dos and notes, and asks for plan changes; viewer: reads and
-- leaves notes.
-- Before contributors existed, an editor followed the trip rule; on trips that asked for approval
-- those editors become contributors, once (this runs only while the old check is in place).
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'trip_members_role_check' and pg_get_constraintdef(oid) not like '%contributor%') then
    update public.trip_members m set role = 'contributor'
      from public.trips t where t.id = m.trip_id and m.role = 'editor' and t.rule <> 'open';
  end if;
end $$;
alter table public.trip_members drop constraint if exists trip_members_role_check;
alter table public.trip_members add constraint trip_members_role_check check (role in ('owner', 'organizer', 'editor', 'contributor', 'viewer'));

-- Changes waiting for an owner or organizer. before and after hold only the parts of the trip
-- the change touches; the app replays them on top of the trip as it is when approved.
create table if not exists public.trip_requests (
  id           uuid primary key default gen_random_uuid(),
  trip_id      text not null references public.trips (id) on delete cascade,
  author       uuid references auth.users (id) on delete set null,
  author_name  text not null default '',
  summary      text[] not null default '{}',
  before       jsonb not null,
  after        jsonb not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'withdrawn')),
  reason       text,
  decided_by   uuid references auth.users (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists trip_requests_trip on public.trip_requests (trip_id, created_at);

create table if not exists public.invites (
  code        text primary key,
  trip_id     text not null references public.trips (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);

-- ---------- access rules ----------

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.invites enable row level security;
alter table public.trip_requests enable row level security;

-- membership check that the rules below can use without looking themselves up recursively
create or replace function public.is_member(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = t and user_id = auth.uid());
$$;

drop policy if exists "members read trips" on public.trips;
create policy "members read trips" on public.trips for select using (public.is_member(id));
-- no insert, update or delete policies: those go through the functions below

drop policy if exists "members see who is on the trip" on public.trip_members;
create policy "members see who is on the trip" on public.trip_members for select using (public.is_member(trip_id));

drop policy if exists "members update their own name" on public.trip_members;
create policy "members update their own name" on public.trip_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ... and only the name: roles change through set_member_role
revoke update on public.trip_members from anon, authenticated;
grant update (name) on public.trip_members to authenticated;

drop policy if exists "members read requests" on public.trip_requests;
create policy "members read requests" on public.trip_requests for select using (public.is_member(trip_id));
-- requests are written only through the functions below

-- your role on a trip, or null when you are not on it
create or replace function public.my_role(t text) returns text
language sql stable security definer set search_path = public as $$
  select role from trip_members where trip_id = t and user_id = auth.uid();
$$;

-- Whether going from old_data to new_data needs an owner's OK, for someone with this role. The
-- role carries the person's level (trip_rule is no longer used here; it sets the level people
-- join with). Mirrors needsApproval and verdict in src/model/rules.ts: keep the two in step.
create or replace function public.change_needs_approval(old_data jsonb, new_data jsonb, trip_rule text, member_role text)
returns boolean language plpgsql immutable set search_path = public as $$
declare k text; free text[]; r text;
begin
  if member_role in ('owner', 'organizer', 'editor') then return false; end if;
  r := case when member_role = 'contributor' then 'approve' else 'all' end;
  free := case when r = 'all' then array['notes'] else array['notes', 'todos', 'todoGroups', 'places', 'docs', 'expenses', 'settlements', 'venmo'] end;
  -- anything outside the free parts changed
  for k in select jsonb_object_keys(old_data) union select jsonb_object_keys(new_data) loop
    if k = 'updatedAt' or k = any(free) then continue; end if;
    if (old_data -> k) is distinct from (new_data -> k) then return true; end if;
  end loop;
  -- something in a free list disappeared
  if exists (select 1 from jsonb_array_elements(coalesce(old_data -> 'notes', '[]')) o
             where not exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'notes', '[]')) n where n ->> 'id' = o ->> 'id')) then return true; end if;
  if r = 'all' then return false; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(old_data -> 'todos', '[]')) o
             where not exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'todos', '[]')) n where n ->> 'id' = o ->> 'id')) then return true; end if;
  if exists (select 1 from unnest(array['places', 'docs', 'expenses', 'settlements']) l, jsonb_array_elements(coalesce(old_data -> l, '[]')) o
             where not exists (select 1 from jsonb_array_elements(coalesce(new_data -> l, '[]')) n where n ->> 'id' = o ->> 'id')) then return true; end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(old_data -> 'todoGroups', '[]')) g
             where not (coalesce(new_data -> 'todoGroups', '[]') ? g)) then return true; end if;
  -- a place put on a day or taken off one (new places count as having been on none)
  return exists (
    select 1 from jsonb_array_elements(coalesce(new_data -> 'places', '[]')) n
    left join lateral (select o from jsonb_array_elements(coalesce(old_data -> 'places', '[]')) o where o ->> 'id' = n ->> 'id' limit 1) w on true
    where coalesce(n -> 'dayIds', '[]') is distinct from coalesce(w.o -> 'dayIds', '[]'));
end $$;

-- invites are read only through join_trip, never listed

-- ---------- functions the app calls ----------

-- Puts a trip online with you as its owner. Fails if the id is already taken.
create or replace function public.share_trip(trip_id text, trip_data jsonb, member_name text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into trips (id, owner, data, version, updated_by) values (trip_id, auth.uid(), trip_data, 1, auth.uid());
  insert into trip_members (trip_id, user_id, name, role) values (trip_id, auth.uid(), coalesce(member_name, ''), 'owner');
  return 1;
end $$;

-- Saves a trip if nobody else has saved since base_version. Returns the new version,
-- or -1 when someone got there first (the app then merges and tries again).
-- Refuses ('needs approval') a change the trip rule says must be requested instead.
create or replace function public.save_trip(trip_id text, trip_data jsonb, base_version bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint; cur trips%rowtype; m text := my_role(trip_id);
begin
  if m is null then raise exception 'not on this trip'; end if;
  select * into cur from trips t where t.id = trip_id for update;
  if cur.version <> base_version then return -1; end if;
  if change_needs_approval(cur.data, trip_data, cur.rule, m) then raise exception 'needs approval'; end if;
  update trips set data = trip_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
    where id = trip_id
    returning version into v;
  return v;
end $$;

-- ---------- requests ----------

-- Asks for a change. Viewers cannot; everyone else on the trip can.
create or replace function public.request_change(trip_id text, before jsonb, after jsonb, summary text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare m text := my_role(trip_id); r uuid;
begin
  if m is null then raise exception 'not on this trip'; end if;
  if m = 'viewer' then raise exception 'viewers cannot change this trip'; end if;
  if octet_length(before::text) + octet_length(after::text) > 1000000 then raise exception 'change too large'; end if;
  insert into trip_requests (trip_id, author, author_name, summary, before, after)
    values (trip_id, auth.uid(), coalesce((select name from trip_members where trip_members.trip_id = request_change.trip_id and user_id = auth.uid()), ''),
            coalesce(summary[1:20], '{}'), before, after)
    returning id into r;
  return r;
end $$;

-- An owner or organizer approves a request, saving the trip with the change made (the app does
-- the merging), or denies it. Returns the new version, -1 when someone saved first (merge and try
-- again), or 0 for a denial.
create or replace function public.decide_request(request_id uuid, approve boolean, reason text, trip_data jsonb, base_version bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare q trip_requests%rowtype; v bigint;
begin
  select * into q from trip_requests where id = request_id for update;
  if q.id is null or coalesce(my_role(q.trip_id), '') not in ('owner', 'organizer') then raise exception 'only the owner or an organizer can do that'; end if;
  if q.status <> 'pending' then raise exception 'already decided'; end if;
  if approve then
    update trips set data = trip_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where id = q.trip_id and version = base_version
      returning version into v;
    if v is null then return -1; end if;
  end if;
  update trip_requests set status = case when approve then 'approved' else 'denied' end,
    reason = nullif(trim(decide_request.reason), ''), decided_by = auth.uid(), decided_at = now()
    where id = request_id;
  return coalesce(v, 0);
end $$;

-- The person who asked can take a request back while it is waiting.
create or replace function public.withdraw_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update trip_requests set status = 'withdrawn', decided_at = now()
    where id = request_id and author = auth.uid() and status = 'pending';
  if not found then raise exception 'not your request, or already decided'; end if;
end $$;

-- ---------- the owner's controls ----------

create or replace function public.set_trip_rule(trip_id text, rule text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if my_role(trip_id) is distinct from 'owner' then raise exception 'only the owner can do that'; end if;
  update trips t set rule = set_trip_rule.rule where t.id = trip_id;
end $$;

create or replace function public.set_member_role(trip_id text, member uuid, role text)
returns void language plpgsql security definer set search_path = public as $$
declare t text := trip_id;
begin
  if my_role(t) is distinct from 'owner' then raise exception 'only the owner can do that'; end if;
  if role not in ('organizer', 'editor', 'contributor', 'viewer') then raise exception 'unknown role'; end if;
  update trip_members m set role = set_member_role.role where m.trip_id = t and m.user_id = member and m.role <> 'owner';
  if not found then raise exception 'not someone you can change'; end if;
end $$;

-- A short code someone can type to join, valid for 30 days. Letters that cannot be misread.
create or replace function public.create_invite(trip_id text)
returns text language plpgsql security definer set search_path = public as $$
declare c text; letters text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
begin
  if not is_member(trip_id) then raise exception 'not on this trip'; end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(letters, 1 + floor(random() * length(letters))::int, 1); end loop;
    begin
      insert into invites (code, trip_id, created_by) values (c, trip_id, auth.uid());
      return c;
    exception when unique_violation then -- try another code
    end;
  end loop;
end $$;

-- Joins the trip an invite code belongs to and returns its id.
create or replace function public.join_trip(invite_code text, member_name text)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select i.trip_id into t from invites i
    where i.code = upper(replace(invite_code, ' ', '')) and i.expires_at > now();
  if t is null then raise exception 'invite not found or expired'; end if;
  -- newcomers get the level the trip was set up with
  insert into trip_members (trip_id, user_id, name, role)
    values (t, auth.uid(), coalesce(member_name, ''),
            (select case tr.rule when 'open' then 'editor' when 'look' then 'viewer' else 'contributor' end from trips tr where tr.id = t))
    on conflict (trip_id, user_id) do update set name = excluded.name;
  return t;
end $$;

-- Leaves a trip. When the owner leaves, the longest-standing member takes over;
-- when the last person leaves, the trip is deleted.
create or replace function public.leave_trip(trip_id text)
returns void language plpgsql security definer set search_path = public as $$
declare next_owner uuid; t text := trip_id;
begin
  delete from trip_members m where m.trip_id = t and m.user_id = auth.uid();
  if not exists (select 1 from trip_members m where m.trip_id = t) then
    delete from trips where id = t; return;
  end if;
  if (select owner from trips where id = t) = auth.uid() then
    select m.user_id into next_owner from trip_members m where m.trip_id = t order by m.role = 'organizer' desc, m.joined_at limit 1;
    update trips set owner = next_owner where id = t;
    update trip_members m set role = 'owner' where m.trip_id = t and m.user_id = next_owner;
  end if;
end $$;

-- The owner can take someone off the trip.
create or replace function public.remove_member(trip_id text, member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t text := trip_id;
begin
  if (select owner from trips where id = t) is distinct from auth.uid() then raise exception 'only the owner can do that'; end if;
  if member = auth.uid() then raise exception 'use leave_trip'; end if;
  delete from trip_members m where m.trip_id = t and m.user_id = member;
end $$;

-- Deletes your account (Apple requires apps to offer this). You leave every trip first, so
-- trips you share with others carry on without you.
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  for r in select m.trip_id from public.trip_members m where m.user_id = auth.uid() loop
    perform public.leave_trip(r.trip_id);
  end loop;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.share_trip(text, jsonb, text), public.save_trip(text, jsonb, bigint), public.create_invite(text),
  public.join_trip(text, text), public.leave_trip(text), public.remove_member(text, uuid), public.delete_account(),
  public.request_change(text, jsonb, jsonb, text[]), public.decide_request(uuid, boolean, text, jsonb, bigint),
  public.withdraw_request(uuid), public.set_trip_rule(text, text), public.set_member_role(text, uuid, text),
  public.my_role(text) from public, anon;
grant execute on function public.share_trip(text, jsonb, text), public.save_trip(text, jsonb, bigint), public.create_invite(text),
  public.join_trip(text, text), public.leave_trip(text), public.remove_member(text, uuid), public.delete_account(),
  public.request_change(text, jsonb, jsonb, text[]), public.decide_request(uuid, boolean, text, jsonb, bigint),
  public.withdraw_request(uuid), public.set_trip_rule(text, text), public.set_member_role(text, uuid, text),
  public.my_role(text) to authenticated;

-- ---------- Claude: filing notes ----------
--
-- The file-note Edge Function (supabase/functions/file-note) asks Claude to file group notes.
-- Each call is counted against the trip, so billing (a per-trip pass the owner buys) can gate it
-- later. Until then every trip gets a free allowance. Only the Edge Function, using the
-- service key, can count or refund a use; the app cannot call these.

create table if not exists public.ai_uses (
  id             uuid primary key default gen_random_uuid(),
  trip_id        text not null references public.trips (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  kind           text not null,
  input_tokens   integer,
  output_tokens  integer,
  created_at     timestamptz not null default now()
);
create index if not exists ai_uses_trip on public.ai_uses (trip_id);

-- A paid pass for a trip. Nothing writes here yet: in-app purchase (RevenueCat) will.
create table if not exists public.trip_passes (
  trip_id   text primary key references public.trips (id) on delete cascade,
  paid_by   uuid references auth.users (id) on delete set null,
  paid_at   timestamptz not null default now(),
  source    text not null default ''
);

alter table public.ai_uses enable row level security;
alter table public.trip_passes enable row level security;
-- no policies: nobody reads or writes these from the app

-- How many uses a trip gets: a free allowance, or a larger one with a pass (a ceiling on cost).
create or replace function public.ai_allowance(t text) returns integer
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from trip_passes p where p.trip_id = t) then 500 else 20 end;
$$;

-- Counts one use against the trip, for someone on it. Returns the use's id and how many are left,
-- or fails with 'allowance used up'.
create or replace function public.claim_ai_use(trip_id text, user_id uuid, kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t text := trip_id; u uuid := user_id; used integer; cap integer := ai_allowance(trip_id); r uuid;
begin
  if not exists (select 1 from trip_members m where m.trip_id = t and m.user_id = u) then raise exception 'not on this trip'; end if;
  perform 1 from trips where id = t for update;  -- one claim at a time per trip
  select count(*) into used from ai_uses a where a.trip_id = t;
  if used >= cap then raise exception 'allowance used up'; end if;
  insert into ai_uses (trip_id, user_id, kind) values (t, u, claim_ai_use.kind) returning id into r;
  return jsonb_build_object('id', r, 'left', cap - used - 1);
end $$;

-- Gives a use back when the call to Claude failed.
create or replace function public.refund_ai_use(use_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from ai_uses where id = use_id;
$$;

revoke all on function public.ai_allowance(text), public.claim_ai_use(text, uuid, text), public.refund_ai_use(uuid)
  from public, anon, authenticated;
grant execute on function public.ai_allowance(text), public.claim_ai_use(text, uuid, text), public.refund_ai_use(uuid)
  to service_role;

-- "Plan it for me" (plan-trip function): one row per plan, counted per person since there is
-- no shared trip yet. A plan covers its outline and the research and build for each stop.
create table if not exists public.ai_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  steps          integer not null default 0,
  input_tokens   bigint not null default 0,
  output_tokens  bigint not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists ai_plans_user on public.ai_plans (user_id, created_at);
alter table public.ai_plans enable row level security;
-- no policies: only the function reads and writes it

-- Starts a plan if the person has plans left this month (cap: 5 for now; the function passes a
-- higher one for testers). Returns its id and how many are left.
drop function if exists public.claim_plan(uuid);
create or replace function public.claim_plan(user_id uuid, cap integer default 5)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := user_id; used integer; r uuid;
begin
  perform pg_advisory_xact_lock(hashtext(u::text));  -- one claim at a time per person
  select count(*) into used from ai_plans p where p.user_id = u and p.created_at > now() - interval '30 days';
  if used >= cap then raise exception 'plan allowance used up'; end if;
  insert into ai_plans (user_id) values (u) returning id into r;
  return jsonb_build_object('id', r, 'left', cap - used - 1);
end $$;

-- One more step of a plan (research or build for a stop), up to 40 per plan.
create or replace function public.claim_plan_step(plan_id uuid, user_id uuid, input_tokens bigint, output_tokens bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update ai_plans p set steps = steps + 1, input_tokens = p.input_tokens + claim_plan_step.input_tokens, output_tokens = p.output_tokens + claim_plan_step.output_tokens
    where p.id = plan_id and p.user_id = claim_plan_step.user_id and p.steps < 40;
  if not found then raise exception 'plan not found or used up'; end if;
end $$;

create or replace function public.refund_plan(plan_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from ai_plans where id = plan_id and steps = 0;
$$;

-- Answers already worked out, by a hash of the request (model, step and everything sent), so
-- asking the very same thing again costs nothing: retries, and testing with the same answers.
create table if not exists public.plan_cache (
  key         text primary key,
  step        text not null,
  response    jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.plan_cache enable row level security;
-- no policies: only the function reads and writes it

revoke all on function public.claim_plan(uuid, integer), public.claim_plan_step(uuid, uuid, bigint, bigint), public.refund_plan(uuid) from public, anon, authenticated;
grant execute on function public.claim_plan(uuid, integer), public.claim_plan_step(uuid, uuid, bigint, bigint), public.refund_plan(uuid) to service_role;

-- Why a function call failed, for whoever maintains the app (Edge Function logs are not
-- reachable from the SQL tools). No policies: only the functions write here.
create table if not exists public.function_errors (
  id       bigserial primary key,
  at       timestamptz not null default now(),
  fn       text not null,
  step     text,
  message  text
);
alter table public.function_errors enable row level security;

-- ---------- files and photos ----------

-- Scans, tickets, receipts and photos, stored under the trip's id ("<trip id>/<file>"). Private
-- bucket: only people on the trip can read or add; the person who added a file, or the owner or
-- an organizer, can remove it. Private documents (IDs) never come here; they stay on the phone.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('trip-files', 'trip-files', false, 26214400)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "trip members read trip files" on storage.objects;
create policy "trip members read trip files" on storage.objects for select to authenticated
  using (bucket_id = 'trip-files' and public.is_member((storage.foldername(name))[1]));
drop policy if exists "trip members add trip files" on storage.objects;
create policy "trip members add trip files" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-files' and public.is_member((storage.foldername(name))[1]));
drop policy if exists "uploader or organizer removes trip files" on storage.objects;
create policy "uploader or organizer removes trip files" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-files' and (owner_id = auth.uid()::text
    or coalesce(public.my_role((storage.foldername(name))[1]), '') in ('owner', 'organizer')));

-- The trip's photos: many, so they live here rather than in the trip itself.
create table if not exists public.trip_photos (
  id           uuid primary key default gen_random_uuid(),
  trip_id      text not null references public.trips (id) on delete cascade,
  user_id      uuid default auth.uid() references auth.users (id) on delete set null,
  author_name  text not null default '',
  path         text not null,
  thumb        text not null,
  -- when it was taken, on the camera's clock (local time where it was taken)
  taken_at     timestamp,
  day_id       text,
  width        integer,
  height       integer,
  caption      text,
  created_at   timestamptz not null default now()
);
create index if not exists trip_photos_trip on public.trip_photos (trip_id, taken_at);
alter table public.trip_photos enable row level security;

drop policy if exists "members see photos" on public.trip_photos;
create policy "members see photos" on public.trip_photos for select using (public.is_member(trip_id));
drop policy if exists "members add photos" on public.trip_photos;
create policy "members add photos" on public.trip_photos for insert to authenticated
  with check (public.is_member(trip_id) and user_id = auth.uid() and path like trip_id || '/%' and thumb like trip_id || '/%');
drop policy if exists "who added it, or an organizer, removes a photo" on public.trip_photos;
create policy "who added it, or an organizer, removes a photo" on public.trip_photos for delete to authenticated
  using (user_id = auth.uid() or coalesce(public.my_role(trip_id), '') in ('owner', 'organizer'));
revoke update on public.trip_photos from anon, authenticated;
grant update (caption, day_id) on public.trip_photos to authenticated;
drop policy if exists "who added it captions a photo" on public.trip_photos;
create policy "who added it captions a photo" on public.trip_photos for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- the name shown is the one on the trip, not whatever the phone sends
create or replace function public.photo_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := coalesce((select name from trip_members where trip_id = new.trip_id and user_id = auth.uid()), '');
  return new;
end $$;
drop trigger if exists photo_author on public.trip_photos;
create trigger photo_author before insert on public.trip_photos for each row execute function public.photo_author();

-- ---------- live updates ----------

-- phones listen for changes to trips they are on (the read rule above still applies)
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.trip_requests;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.trip_photos;
exception when duplicate_object then null;
end $$;
