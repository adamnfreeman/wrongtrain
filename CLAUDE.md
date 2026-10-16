# WrongTrain

A group trip planner, heading for the iOS App Store. Made for millennials travelling without kids
(child-free is the default and a selling point): Claude's prompts assume adults who would rather
avoid family resorts and kids' places. It began as the Japan 2026 page at
wrongtrain.lol, a single HTML file reading the trip from a Google Sheet.

## Branches: be careful with `main`

- **`main` is the live website** (GitHub Pages, custom domain wrongtrain.lol):
  - `/` is the **Japan 2026 page**, in real use for a trip from Oct 26 to Nov 8, 2026.
    `index.html` + `sw.js` (offline support) + `phrases-audio.json`. Do not change it
    without asking; it must keep working with no signal.
  - `/app/` is a **test copy of the WrongTrain build**, published by hand (see below).
- **`app` is where WrongTrain is developed.** The app lives in `app/`; the Japan page's
  source is kept in `legacy/` for reference.

## The app (`app/`)

React + TypeScript + Vite, wrapped for iOS with Capacitor 8 (`app/ios/`, Swift Package
Manager, no CocoaPods). Read `app/README.md` for the code layout and `app/IOS.md` for building
on a Mac.

- Trips are plain JSON (`src/model/types.ts`), saved in localStorage and, in the iOS app, also
  in Preferences (`src/native.ts`).
- Every change is a pure function in `src/model/edit.ts`. Days are always consecutive dates.
- Shared trips sync through Supabase: `supabase/schema.sql`, `src/sync/engine.ts`, three-way
  merge in `src/model/merge.ts`. After changing `schema.sql`, paste it into the Supabase SQL
  Editor and run it (safe to run again).
- Approvals: the owner sets a rule per trip (open / approve changes, the default / approve
  everything) and roles (organizer, editor, viewer). Edits that need the owner's OK become
  requests, approved or denied on the To do tab. `src/model/rules.ts` and
  `change_needs_approval` in `schema.sql` must agree.
- Supabase project: `https://wklwpihkpiuniazhidjz.supabase.co`. The publishable key in
  `src/sync/config.ts` is public by design. Never put the secret/service_role key anywhere.
- Ideas box: a group note on a shared trip goes to the `file-note` Edge Function
  (`supabase/functions/`), which asks Claude how to file it; the app applies the answer through
  `patchTrip` (`src/model/filing.ts`, `src/sync/filing.ts`), so the trip rule applies. The
  Anthropic key is only a Supabase secret (`ANTHROPIC_API_KEY`), never in the app. Uses are
  counted per trip in `ai_uses` (20 free; `trip_passes` is there for the paid pass).
- Sign-in is an emailed 6-digit code. Email goes through Gmail SMTP (adam@thefreemans.io for
  now; wrongtrain.lol is being added to Google Workspace). The email templates contain only
  the code, no link.

- Wallet tab: documents (`src/ui/wallet.tsx`; shared ones in `trip.docs`, private IDs only on
  the phone in `src/model/privateDocs.ts`) and money (`src/model/money.ts`: expenses, balances,
  settling up, Venmo links). Photos are under each day (`src/ui/photos.tsx`, rows in
  `trip_photos`). Files are kept on the phone and, for shared trips, in the private `trip-files`
  bucket under the trip's id (`src/sync/files.ts`); private paths start `private/` and are
  never uploaded.

- "Plan a trip for me" (welcome screen, `src/ui/planner.tsx`): questions, then the `plan-trip`
  function (outline, then web research and a plan per city; `supabase/functions/_shared/planner.ts`),
  then `src/model/planner.ts` makes a normal trip. Plans are counted per person in `ai_plans`.
- Appearance (like the phone / light / dark) at the bottom of every page (`src/ui/theme.tsx`).

- Testing the planner cheaply: test mode in the app, `plan_cache`, and the `PLANNER_MODEL`
  (now `claude-haiku-5-5`) and `PLAN_TESTERS` secrets; see `app/supabase/functions/README.md`.
  **Before launch:** delete `PLANNER_MODEL` (back to the best model) and hide the test mode switch.

## Commands (in `app/`)

```
npm run dev        # local preview
npm run build      # typecheck + build into dist/
npm test           # unit tests (vitest)
npm run e2e        # browser tests of every screen, the editor and sharing (Playwright)
npm run e2e:live   # live test against Supabase; needs anonymous sign-ins switched on
npm run ios        # build, copy into ios/, open Xcode
```

The database rules can be checked on a local Postgres: `sh supabase/test/run.sh <psql flags>`.

## Publishing the test copy at wrongtrain.lol/app/

Build on the `app` branch, then on `main` replace the `app/` folder with `app/dist/` and push.
Touch nothing else on `main`. GitHub Pages updates within a couple of minutes.

## Where things stand (Oct 16, 2026)

Done: trip model, sample trip, all screens, trip editor, sharing (invite codes, live sync,
offline queue), email sign-in, iOS project with icon and launch screen, first build running on
the iPhone, owner approvals (trip rule, roles, requests and the approval list), the ideas box
(Claude files group notes; not deployed yet).

Next:
1. **Run the updated `schema.sql` in Supabase** for approvals (roles, trip rule, requests).
   Do this before installing or publishing this version: it reads the new `rule` column, so
   shared trips stop syncing until the database has it. Builds signed with the
   personal team work on the iPhone; build from Xcode (`npm run ios`, then Run), since building
   into `ios/App/build` inside the iCloud-synced Desktop fails code signing.
2. **Deploy the ideas box**: run `schema.sql` again, create an Anthropic API key, store it as
   the `ANTHROPIC_API_KEY` secret and deploy `file-note`. Click-by-click steps are in
   `app/supabase/functions/README.md`.
3. **Map tiles.** The map uses OpenStreetMap's tile server, which does not allow app use and
   may block requests from the iOS web view. Switch to MapTiler (waiting on an API key); the
   tile URL is in `src/ui/map.tsx` and `src/ui/form.tsx`. MapTiler geocoding would also let
   places Claude files get map pins (they are filed without coordinates for now).
4. **Apple Developer account**: enrollment pending. Then App Store Connect, TestFlight.
5. **Untested by a person yet**: sharing between two real devices (the live test covers it
   with throwaway users).
6. **"Something nearby"** (built Oct 16) on Today: pick a mood, get 5 places from OpenStreetMap
   (Overpass), chosen by Claude on shared trips (`suggest-nearby`), else the nearest. The public
   Overpass server will not do for many users: move to a paid places API or our own server.
7. **Planner, part 2 onwards** (see the vision in Oct 16 notes): per-person budgets and tastes
   on a shared trip, personal plans alongside the group's, "who's where"; seeing a friend's
   schedule and copying an event, hotel or place from their timeline into yours;
   leading idea (not decided): one timeline where each item says who is in it (blank =
   everyone), couples/pairs default to each other, "My timeline" is a filter, "Join this"
   adds you to a friend's item, and each night's stay can differ per pair; in-the-moment help
   (more moods done; "who's playing tonight" needs event listings); leave-now notifications and
   real transit directions; step-by-step station guidance; "get me home" options; affiliate links.
8. **Share my location / friend finder** (asked for Oct 16): see where everyone on the trip
   is, by choice and for a set time.
9. Later: Sign in with Apple (needs the developer account), universal links so invite links
   open the app, a city list for guessing time zones (Kyoto, Florence and similar don't match
   an IANA zone name), editing the "Before you go" guides.

## Conventions

- Plain, specific wording in the UI and in comments; comments explain why.
- Commit as Adam (adam@thefreemans.io).
