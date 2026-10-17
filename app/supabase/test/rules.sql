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
select pg_temp.ok((select rule from trips where id = 't1') = 'open', 'a new trip lets people change anything by default');
select public.set_trip_rule('t1', 'approve');
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
select pg_temp.ok((select role from trip_members where user_id = auth.uid()) = 'contributor', 'Ben joins as a contributor, the level Ana set (add ideas, ask for plan changes)');

-- as a contributor, Ben adds things directly and asks for the rest
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
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.save(pg_temp.d() - 'places') > 0, 'an editor (can change anything) removes things directly, whatever the trip was set up with');
select pg_temp.ok(pg_temp.save(pg_temp.d() || '{"name":"Italy 3"}') > 0, '... and rename the trip');
select pg_temp.ok(pg_temp.fails($$select public.remove_member('t1', '00000000-0000-0000-0000-00000000000a')$$), 'Ben cannot remove the owner');
update trip_members set name = 'Benjamin' where user_id = auth.uid();
update trip_members set name = 'not you' where user_id <> auth.uid();
select pg_temp.ok((select name from trip_members where user_id = '00000000-0000-0000-0000-00000000000a') = 'Ana', 'nobody can rename someone else');
select pg_temp.ok((select name from trip_members where user_id = auth.uid()) = 'Benjamin', 'but you can rename yourself');

-- counting Claude's filings (the file-note Edge Function, with the service key)
select pg_temp.act('ben');
select pg_temp.ok(pg_temp.fails($$select public.claim_ai_use('t1', auth.uid(), 'file-note')$$), 'the app cannot count a filing itself');
select pg_temp.ok(pg_temp.fails($$select public.refund_ai_use(gen_random_uuid())$$), '... or give one back');
reset role;
set role service_role;
select pg_temp.ok((public.claim_ai_use('t1', '00000000-0000-0000-0000-00000000000b', 'file-note') ->> 'left')::int = 19, 'the Edge Function counts a filing: 19 of 20 free ones left');
select pg_temp.ok(pg_temp.fails($$select public.claim_ai_use('t1', '00000000-0000-0000-0000-00000000000c', 'file-note')$$), '... only for someone on the trip');
select public.refund_ai_use((select id from ai_uses limit 1));
select pg_temp.ok((select count(*) from ai_uses) = 0, 'a failed call is given back');
reset role;
insert into ai_uses (trip_id, kind) select 't1', 'file-note' from generate_series(1, 20);
select pg_temp.act('ben');
select pg_temp.ok((select count(*) from ai_uses) = 0, 'nobody reads usage from the app');
reset role;
set role service_role;
select pg_temp.ok(pg_temp.fails($$select public.claim_ai_use('t1', '00000000-0000-0000-0000-00000000000b', 'file-note')$$), 'after 20 the free allowance is used up');
reset role;
insert into trip_passes (trip_id) values ('t1');
set role service_role;
select pg_temp.ok((public.claim_ai_use('t1', '00000000-0000-0000-0000-00000000000b', 'file-note') ->> 'left')::int = 479, 'a pass raises the allowance');
reset role;

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

-- documents, expenses, files and photos, on a new trip: Ana owns it, Cat joins as a contributor
select pg_temp.act('ana');
select public.share_trip('t3', '{"name":"Japan"}', 'Ana');
select public.set_trip_rule('t3', 'approve');
create temp table code3 as select public.create_invite('t3') as c;
grant select on code3 to authenticated;
select pg_temp.act('cat');
select public.join_trip((select c from code3), 'Cat');
create function pg_temp.d3() returns jsonb language sql as $$ select data from trips where id = 't3' $$;
create function pg_temp.save3(j jsonb) returns bigint language sql as $$ select public.save_trip('t3', j, (select version from trips where id = 't3')) $$;
select pg_temp.ok(pg_temp.save3(pg_temp.d3() || '{"docs":[{"id":"d1","title":"JR Pass"}],"expenses":[{"id":"e1","amount":30}],"settlements":[{"id":"s1"}],"venmo":{"Cat":"cat-c"}}') > 0, 'a contributor adds a ticket, an expense, a payment and her Venmo name directly');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save3(pg_temp.d3() || '{"docs":[]}')$$), '... but removing a ticket needs approval');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save3(pg_temp.d3() || '{"expenses":[]}')$$), '... and so does removing an expense');
select pg_temp.ok(pg_temp.fails($$select pg_temp.save3(pg_temp.d3() || '{"currency":"JPY"}')$$), '... or changing the trip''s currency');

insert into storage.objects (bucket_id, name, owner_id) values ('trip-files', 't3/scan.jpg', auth.uid()::text);
select pg_temp.ok((select count(*) from storage.objects where name = 't3/scan.jpg') = 1, 'someone on the trip can store a file under it and read it back');
select pg_temp.ok(pg_temp.fails($$insert into storage.objects (bucket_id, name, owner_id) values ('trip-files', 'nope/x.jpg', auth.uid()::text)$$), '... but not under a trip they are not on');
insert into trip_photos (trip_id, path, thumb, taken_at) values ('t3', 't3/p1.jpg', 't3/p1.t.jpg', '2026-11-02 14:00');
select pg_temp.ok((select author_name from trip_photos where path = 't3/p1.jpg') = 'Cat', 'a photo added shows the name she has on the trip');
select pg_temp.ok(pg_temp.fails($$insert into trip_photos (trip_id, path, thumb) values ('t3', 'other/p.jpg', 'other/p.t.jpg')$$), 'a photo must be stored under its trip');
select pg_temp.ok(pg_temp.fails($$update trip_photos set path = 't3/other.jpg'$$), 'a photo''s file cannot be swapped');

select pg_temp.act('');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'trip-files') = 0, 'signed out, no trip files can be seen');
select pg_temp.act('ana');
select pg_temp.ok((select count(*) from trip_photos) = 1 and (select count(*) from storage.objects where name like 't3/%') = 1, 'the owner sees the trip''s photos and files');
delete from trip_photos where path = 't3/p1.jpg';
delete from storage.objects where name = 't3/scan.jpg';
select pg_temp.ok((select count(*) from trip_photos) = 0 and (select count(*) from storage.objects where name like 't3/%') = 0, '... and can remove ones others added');
reset role;
select pg_temp.ok(exists (select 1 from storage.buckets where id = 'trip-files' and not public), 'the files bucket is private');

-- plans: 5 a month per person, steps only on your own plan
select pg_temp.act('ana');
select pg_temp.ok(pg_temp.fails($$select public.claim_plan(auth.uid())$$), 'the app cannot start a plan itself (only the function can)');
reset role;
create temp table plans as select public.claim_plan('00000000-0000-0000-0000-00000000000a') as p;
select public.claim_plan('00000000-0000-0000-0000-00000000000a') from generate_series(1, 4);
select pg_temp.ok(pg_temp.fails($$select public.claim_plan('00000000-0000-0000-0000-00000000000a')$$), 'a sixth plan in a month is refused');
select pg_temp.ok(((select p from plans) ->> 'left')::int = 4, '... and the first said four were left');
select pg_temp.ok((public.claim_plan('00000000-0000-0000-0000-00000000000a', 100) ->> 'left')::int = 94, 'a tester with a higher cap can carry on');
select public.claim_plan_step(((select p from plans) ->> 'id')::uuid, '00000000-0000-0000-0000-00000000000a', 100, 50);
select pg_temp.ok((select steps from ai_plans where id = ((select p from plans) ->> 'id')::uuid) = 1, 'a step counts against the plan, with its tokens');
select pg_temp.ok(pg_temp.fails($$select public.claim_plan_step(((select p from plans) ->> 'id')::uuid, '00000000-0000-0000-0000-00000000000c', 0, 0)$$), 'nobody else can use someone''s plan');

-- the level people join with follows how the trip was set up
select pg_temp.act('ana');
select public.share_trip('t9', '{"name":"Lisbon"}', 'Ana');
select public.set_trip_rule('t9', 'look');
create temp table code9 as select public.create_invite('t9') as c;
grant select on code9 to authenticated;
select pg_temp.act('cat');
select public.join_trip((select c from code9), 'Cat');
select pg_temp.ok((select role from trip_members where trip_id = 't9' and user_id = auth.uid()) = 'viewer', 'on a trip set to "look", Cat joins able to look and leave notes');
select pg_temp.ok(pg_temp.fails($$select public.save_trip('t9', (select data from trips where id = 't9') || '{"places":[{"id":"p1"}]}', 1)$$), '... and cannot add a place');
select pg_temp.act('ana');
select public.set_member_role('t9', '00000000-0000-0000-0000-00000000000c', 'contributor');
select pg_temp.act('cat');
select pg_temp.ok(public.save_trip('t9', (select data from trips where id = 't9') || '{"places":[{"id":"p1"}]}', 1) = 2, 'Ana makes her a contributor: now she adds a place');
select pg_temp.ok(pg_temp.fails($$select public.save_trip('t9', '{"name":"Porto"}', 2)$$), '... but renaming the trip is a request');

-- profile pictures: your own, as a small JPEG, seen only by people on your trips
select pg_temp.act('cat');
update trip_members set avatar = 'data:image/jpeg;base64,AAAA' where user_id = auth.uid();
select pg_temp.ok((select avatar from trip_members where trip_id = 't9' and user_id = auth.uid()) = 'data:image/jpeg;base64,AAAA', 'Cat sets her profile picture');
select pg_temp.ok(pg_temp.fails($$update trip_members set avatar = 'javascript:alert(1)' where user_id = auth.uid()$$), '... only as a JPEG picture');
select pg_temp.ok(pg_temp.fails($$update trip_members set avatar = 'data:image/jpeg;base64,' || repeat('A', 70000) where user_id = auth.uid()$$), '... and a small one');
update trip_members set avatar = 'data:image/jpeg;base64,BBBB' where user_id <> auth.uid();
select pg_temp.act('ana');
select pg_temp.ok((select avatar from trip_members where trip_id = 't9' and user_id = auth.uid()) is null, 'nobody can set someone else''s picture');
select pg_temp.ok((select avatar from trip_members where trip_id = 't9' and user_id = '00000000-0000-0000-0000-00000000000c') = 'data:image/jpeg;base64,AAAA', 'Ana, on a trip with Cat, sees her picture');

-- where everyone is: shared by choice, seen only by people on the trip, only until the chosen time
select pg_temp.act('cat');
select public.share_location('t9', 38.71, -9.14, 20, now() + interval '1 hour');
select pg_temp.ok((select count(*) from trip_locations where trip_id = 't9') = 1, 'Cat shares where she is, for an hour');
select pg_temp.ok(pg_temp.fails($$insert into trip_locations (trip_id, user_id, lat, lng, until) values ('t9', '00000000-0000-0000-0000-00000000000a', 0, 0, now() + interval '1 hour')$$), '... nobody can post a location for someone else');
select pg_temp.ok(pg_temp.fails($$select public.share_location('t1', 1, 1, 1, now() + interval '1 hour')$$), '... or on a trip they are not on');
select pg_temp.ok(pg_temp.fails($$select public.share_location('t9', 1, 1, 1, now() - interval '1 hour')$$), '... or for a time already past');
select pg_temp.act('ana');
select pg_temp.ok((select lat from trip_locations where trip_id = 't9' and user_id = '00000000-0000-0000-0000-00000000000c') = 38.71, 'Ana, on the trip, sees it');
select pg_temp.act('ben');
select pg_temp.ok((select count(*) from trip_locations) = 0, 'Ben, not on that trip, does not');
select pg_temp.act('cat');
select public.share_location('t9', 38.72, -9.13, 15, now() + interval '100 days');
select pg_temp.ok((select until from trip_locations where trip_id = 't9' and user_id = auth.uid()) < now() + interval '31 days', 'sharing is capped at 30 days');
select public.stop_sharing_location('t9');
select pg_temp.act('ana');
select pg_temp.ok((select count(*) from trip_locations where trip_id = 't9') = 0, 'when Cat stops, it is gone');

-- deleting a trip for everyone: only its owner can
select pg_temp.act('cat');
select pg_temp.ok(pg_temp.fails($$select public.delete_trip('t9')$$), 'someone on the trip who is not the owner cannot delete it');
select pg_temp.act('ana');
select public.delete_trip('t9');
select pg_temp.ok((select count(*) from trips where id = 't9') = 0 and (select count(*) from trip_members where trip_id = 't9') = 0, 'the owner deletes it for everyone, people and all');
