# WrongTrain

Trip planner for groups, heading for iOS with Capacitor. Work in progress on the `app` branch;
`main` stays the live Japan 2026 page at wrongtrain.lol.

```
npm install
npm run dev     # local preview
npm run build   # typecheck and production build into dist/
npm test        # unit tests for the trip model and editing
npm run e2e     # build, then drive every screen, the editor, sharing and approvals in headless Chromium
npm run e2e:live  # sharing, joining and live updates against the real Supabase project
```

`e2e:live` signs in three throwaway anonymous users, so "Allow anonymous sign-ins" must be on
in Supabase while it runs; it deletes everything it creates. Behind a proxy, run it with
`NODE_USE_ENV_PROXY=1`.

## Shared trips

`supabase/schema.sql` sets up the database: paste it into the Supabase SQL Editor and run it
(safe to run again). `supabase/test/run.sh` checks its access rules on a local Postgres.
`src/sync/` keeps shared trips in step: saves carry the version they were based on, a refused
save is merged (`model/merge.ts`) and sent again, and other people's saves arrive live.

The owner sets a rule for each shared trip (open, approve changes, or approve everything) and a
role for each person (organizer, editor, viewer). `model/rules.ts` decides which edits need the
owner's OK; those are sent as requests (kept on the phone until there is signal) and listed on
the To do tab, where an owner or organizer approves or denies them (`ui/requests.tsx`). The
database applies the same rule on every save (`change_needs_approval` in `schema.sql`), so the
two must be kept in step.

The browser tests need Python 3 (for a local web server) and Playwright's Chromium;
screenshots land in `e2e/out/`.

## Layout

- `src/model/` – the trip data model (`types.ts`), date and time helpers, the sample trip,
  the "How much time do I have?" logic, search, and the on-phone store.
- `src/ui/` – the screens: Today, Days, Transit, Places, Map, Phrases, To do, and search.
- `src/phrases/` – phrase packs by language. Japanese ships with recorded clips in
  `public/phrases/ja.json`; phrases without a clip use the phone's own voice.

- `src/model/edit.ts` – every change to a trip, as pure functions (tested in `edit.test.ts`).
  Days always stay consecutive: inserting or deleting a day re-dates the ones after it.
- `src/ui/editors.tsx` – the edit sheets: new trip, trip settings, day, leg, place, to-do.
- `src/model/rules.ts` – who may change what on a shared trip, and requests for the rest.

Trips are saved in localStorage on the phone; shared ones also sync through Supabase.
