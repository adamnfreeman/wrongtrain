-- Checks the access rules and functions in schema.sql, acting as four people:
-- Ana (owner), Ben (joins with a code, then has his role changed), Cat (never invited) and
-- nobody signed in.
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
select pg_temp.ok((select rule from trips where id = 't1') = 'approve', 'a new trip asks for approval by default');
select pg_temp.ok((select role from trip_members where user_id = auth.uid()) = 'editor', 'Ben joins as an editor');

-- under "approve", Ben adds things directly and asks for the rest
create function pg_temp.d() returns jsonb language sql as $$ select data from trips where id = 't1' $$;
create function pg_temp.v() returns bigint language sql as $$ select version from trips where id = 't1' $$;
create function pg_temp.save(j jsonb) returns bigint language sql as $$ select public.save_trip('t1', j, pg_temp.v()) $$;
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"name":"Ben''s trip"}')$$), 'Ben cannot rename the trip directly');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"notes":[{"id":"n1","text":"Sento?"}]}') = 3, 'Ben can add a note (now 3)');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"places":[{"id":"p1","name":"Ramen","wishlist":true}],"todos":[{"id":"x1","done":false}],"todoGroups":["Packing"]}') = 4, '... and an idea and a to-do (now 4)');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"todos":[{"id":"x1","done":true}],"updatedAt":"later"}') = 5, '... and tick it off (now 5)');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"places":[{"id":"p1","name":"Ramen, cash only","wishlist":true}]}') = 6, '... and fix a place''s details (now 6)');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"places":[{"id":"p1","name":"Ramen","dayIds":["d1"]}]}')$$), 'but putting a place on a day needs approval');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"places":[{"id":"p1"},{"id":"p2","dayIds":["d1"]}]}')$$), '... so does a new place already on a day');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"notes":[]}')$$), '... and removing a note');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"todos":[]}')$$), '... or a to-do');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"todoGroups":[]}')$$), '... or a to-do group');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() - 'places')$$), '... or a place');
select pg_temp.ok(public.save_trip('t1', pg_temp.d() || '{"name":"stale"}', 1) = -1, 'an out-of-date save is still sent back to merge first');
select pg_temp.ok(pg_temp.fails($$update trip_members set role = 'owner' where user_id = auth.uid()$$), 'Ben cannot make himself the owner');
select pg_temp.ok(pg_temp.fails($$select public.set_trip_rule('t1', 'open')$$), '... or change the trip rule');
select pg_temp.ok(pg_temp.fails($$select public.set_member_role('t1', auth.uid(), 'organizer')$$), '... or his role');

create temp table req as select public.request_change('t1', jsonb_build_object('name', 'Italy 2'), '{"name":"Roma"}', array['Rename the trip to Roma']) as id;
grant select on req to authenticated;
select pg_temp.ok((select status from trip_requests where id = (select id from req)) = 'pending', 'Ben asks to rename it instead');
select pg_temp.ok((select author_name from trip_requests where id = (select id from req)) = 'Ben', '... with his name on the request');
select pg_temp.ok(pg_temp.fails($$select public.decide_request((select id from req), true, null, pg_temp.d(), pg_temp.v())$$), 'Ben cannot approve his own request');

select pg_temp.act('cat');
select pg_temp.ok((select count(*) from trip_requests) = 0, 'someone not on the trip cannot see its requests');
select pg_temp.ok(pg_temp.fails($$select public.request_change('t1', '{}', '{}', '{}')$$), '... or make one');

select pg_temp.act('ana');
select pg_temp.ok(public.decide_request((select id from req), true, null, pg_temp.d() || '{"name":"Roma"}', pg_temp.v()) = 7, 'Ana approves it, saving the trip (now 7)');
select pg_temp.ok(pg_temp.d() ->> 'name' = 'Roma' and (select status from trip_requests where id = (select id from req)) = 'approved', '... renamed, and marked approved');
select pg_temp.ok(pg_temp.fails($$select public.decide_request((select id from req), false, null, null, null)$$), 'a decided request cannot be decided again');

select pg_temp.act('ben');
create temp table req2 as select public.request_change('t1', '{}', '{"name":"Firenze"}', array['Rename']) as id;
grant select on req2 to authenticated;
select pg_temp.act('ana');
select pg_temp.ok(public.decide_request((select id from req2), false, 'Keep Roma', null, null) = 0, 'Ana denies the next one');
select pg_temp.ok((select reason from trip_requests where id = (select id from req2)) = 'Keep Roma' and pg_temp.d() ->> 'name' = 'Roma', '... with her reason, and the trip unchanged');

select pg_temp.act('ben');
create temp table req3 as select public.request_change('t1', '{}', '{"name":"Napoli"}', array['Rename']) as id;
grant select on req3 to authenticated;
select pg_temp.act('ana');
select pg_temp.ok(pg_temp.fails($$select public.withdraw_request((select id from req3))$$), 'only the person who asked can withdraw a request');
select pg_temp.act('ben');
select public.withdraw_request((select id from req3));
select pg_temp.ok((select status from trip_requests where id = (select id from req3)) = 'withdrawn', 'Ben withdraws his');

-- roles
select pg_temp.act('ana');
select pg_temp.ok(pg_temp.fails($$select public.set_member_role('t1', auth.uid(), 'viewer')$$), 'the owner cannot be demoted');
select public.set_member_role('t1', '00000000-0000-0000-0000-00000000000b', 'viewer');
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"notes":[{"id":"n1","text":"Sento?"},{"id":"n2","text":"Gelato"}]}') > 0, 'a viewer can still leave a note');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"places":[{"id":"p9"}]}')$$), '... but not add a place');
select pg_temp.ok(pg_temp.fails($$select public.request_change('t1', '{}', '{"name":"x"}', '{}')$$), '... or ask for changes');
select pg_temp.act('ana');
select public.set_member_role('t1', '00000000-0000-0000-0000-00000000000b', 'organizer');
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"name":"Italia"}') > 0, 'an organizer changes anything directly');
select pg_temp.act('ana');
select public.set_member_role('t1', '00000000-0000-0000-0000-00000000000b', 'editor');
select public.set_trip_rule('t1', 'all');
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save(pg_temp.d() || '{"todos":[{"id":"x1","done":false}]}')$$), 'under "all", even ticking a to-do is a request');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"notes":[{"id":"n1","text":"Sento?"},{"id":"n2","text":"Gelato"},{"id":"n3","text":"Ok"}]}') > 0, '... but notes go straight in');
select pg_temp.act('ana');
select public.set_trip_rule('t1', 'open');
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.save(pg_temp.d() - 'places') > 0, 'under "open", an editor can remove things');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"name":"Italy 3"}') > 0, '... and rename the trip');
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
select pg_temp.ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trip_requests'), '... and so are requests');
