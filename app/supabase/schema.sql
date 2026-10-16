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
--   - only the trip's owner can delete it or remove other people
--   - joining needs an invite code from someone already on the trip

-- ---------- tables ----------

create table if not exists public.trips (
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  data        jsonb not null,
  version     bigint not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

create table if not exists public.trip_members (
  trip_id    text not null references public.trips (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user on public.trip_members (user_id);

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
create or replace function public.save_trip(trip_id text, trip_data jsonb, base_version bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not is_member(trip_id) then raise exception 'not on this trip'; end if;
  update trips set data = trip_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
    where id = trip_id and version = base_version
    returning version into v;
  return coalesce(v, -1);
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
  insert into trip_members (trip_id, user_id, name, role) values (t, auth.uid(), coalesce(member_name, ''), 'editor')
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
    select m.user_id into next_owner from trip_members m where m.trip_id = t order by m.joined_at limit 1;
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
  public.join_trip(text, text), public.leave_trip(text), public.remove_member(text, uuid), public.delete_account() from public, anon;
grant execute on function public.share_trip(text, jsonb, text), public.save_trip(text, jsonb, bigint), public.create_invite(text),
  public.join_trip(text, text), public.leave_trip(text), public.remove_member(text, uuid), public.delete_account() to authenticated;

-- ---------- live updates ----------

-- phones listen for changes to trips they are on (the read rule above still applies)
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;
