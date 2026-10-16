-- Checks the access rules and functions in schema.sql, acting as four people:
-- Ana (owner), Ben (joins with a code), Cat (never invited) and nobody signed in.
\set ON_ERROR_STOP on
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cat@example.com');

create function pg_temp.act(who text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', case who when 'ana' then '00000000-0000-0000-0000-00000000000a'
    when 'ben' then '00000000-0000-0000-0000-00000000000b' when 'cat' then '00000000-0000-0000-0000-00000000000c' else '' end, false);
end $$;
create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS %', what; else raise exception 'FAIL %', what; end if;
end $$;
-- runs a statement and reports whether it raised
create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;

select pg_temp.act('ana');
select pg_temp.ok(public.share_trip('t1', '{"name":"Italy"}', 'Ana') = 1, 'Ana shares a trip at version 1');
select pg_temp.ok((select count(*) from trips) = 1, 'Ana can read her trip');
select pg_temp.ok(pg_temp.fails($$select public.share_trip('t1', '{}', 'Ana')$$), 'the same trip id cannot be shared twice');
select pg_temp.ok(pg_temp.fails($$insert into trips (id, owner, data) values ('x', auth.uid(), '{}')$$), 'trips cannot be inserted directly, only shared');
select pg_temp.ok(public.save_trip('t1', '{"name":"Italy 2"}', 1) = 2, 'save with the current version succeeds (now 2)');
select pg_temp.ok(public.save_trip('t1', '{"name":"stale"}', 1) = -1, 'save from an old version is refused');
select pg_temp.ok((select data->>'name' from trips where id = 't1') = 'Italy 2', 'a refused save changes nothing');
create temp table code as select public.create_invite('t1') as c;
grant select on code to authenticated;
select pg_temp.ok((select length(c) from code) = 8, 'invite code has 8 characters');

select pg_temp.act('cat');
select pg_temp.ok((select count(*) from trips) = 0, 'someone not on the trip cannot see it');
select pg_temp.ok((select count(*) from trip_members) = 0, '... or who is on it');
select pg_temp.ok((select count(*) from invites) = 0, '... or any invite codes');
select pg_temp.ok(pg_temp.fails($$select public.save_trip('t1', '{"name":"hacked"}', 2)$$), '... and cannot save over it');
select pg_temp.ok(pg_temp.fails($$select public.create_invite('t1')$$), '... or make an invite');
select pg_temp.ok(pg_temp.fails($$select public.join_trip('NOTACODE', 'Cat')$$), 'a wrong code does not let you in');
update trips set data = '{"name":"hacked"}' where id = 't1';
select pg_temp.ok((select count(*) from trips) = 0, 'a direct update reaches nothing');

select pg_temp.act('ben');
select pg_temp.ok(public.join_trip(lower((select c from code)), 'Ben') = 't1', 'Ben joins with the code, typed in lower case');
select pg_temp.ok((select count(*) from trips) = 1, 'Ben can now read the trip');
select pg_temp.ok((select count(*) from trip_members) = 2, 'Ben sees both people on it');
select pg_temp.ok(public.save_trip('t1', '{"name":"Italy 3"}', 2) = 3, 'Ben can save (now 3)');
select pg_temp.ok(pg_temp.fails($$select public.remove_member('t1', '00000000-0000-0000-0000-00000000000a')$$), 'Ben cannot remove the owner');
update trip_members set name = 'Benjamin' where user_id = auth.uid();
update trip_members set name = 'not you' where user_id <> auth.uid();
select pg_temp.ok((select name from trip_members where user_id = '00000000-0000-0000-0000-00000000000a') = 'Ana', 'nobody can rename someone else');
select pg_temp.ok((select name from trip_members where user_id = auth.uid()) = 'Benjamin', 'but you can rename yourself');

select pg_temp.act('ana');
select public.leave_trip('t1');
select pg_temp.act('ben');
select pg_temp.ok((select owner from trips where id = 't1') = auth.uid(), 'when the owner leaves, the next person takes over');
select pg_temp.ok((select role from trip_members where user_id = auth.uid()) = 'owner', '... with the owner role');

select pg_temp.act('');
select pg_temp.ok((select count(*) from trips) = 0, 'signed out, you see nothing');
select pg_temp.ok(pg_temp.fails($$select public.share_trip('t2', '{}', 'x')$$), 'signed out, you cannot share');

select pg_temp.act('ben');
select public.delete_account();
reset role;
select pg_temp.ok(not exists (select 1 from auth.users where email = 'ben@example.com'), 'deleting an account removes the user');
select pg_temp.ok(not exists (select 1 from trips where id = 't1'), 'and a trip left with nobody on it is deleted');
select pg_temp.ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trips'), 'trips are published for live updates');
