# WrongTrain

A group trip planner, heading for the iOS App Store. Made for millennials travelling without kids
(child-free is the default and a selling point): Claude's prompts assume adults who would rather
avoid family resorts and kids' places. It began as the Japan 2026 page at
wrongtrain.lol, a single HTML file reading the trip from a Google Sheet.

**Read `VISION.md` first**: who the app is for and what it should become.

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
- Account & settings: the round button in the top corner of every page but Days (`AccountButton` in
  `src/ui/account.tsx`). Sign in/out, your name, Appearance (`src/ui/theme.tsx`) and the build
  number and time (set in `vite.config.ts`), so you can tell whether a phone has the latest.

- Trip files: "Open a trip file" on the welcome screen reads a trip saved as JSON
  (`src/model/tripFile.ts`); opening a newer file of the same trip updates it and keeps ticks,
  notes and the wallet. `node legacy/to-app.mjs` turns the Japan 2026 sheet into one (it asks
  for your Japan page name and passcode and saves to the Desktop; run it again after sheet
  changes). The file holds booking numbers and logins: never put it in the repo.

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
9. **Wallet and Phrases extras** (asked for Oct 16): a currency calculator (type an amount in
   either currency; rates already come from Frankfurter for Money); more phrase languages
   (packs in `src/phrases`); starring phrases so favourites sit at the top, and reordering them.
10. **Look and feel fixes** (asked for Oct 16, for later): move "The whole route" to the Trip
    page (not Days); the Days slider still doesn't sit right at the top on the phone (check in
    the Simulator, which has the notch); the swipe between pages bounces on some pages, such as
    Phrases (make it the same on every page, or take it out); put Today's sections back unfolded
    (folding felt less natural than expected).
11. Later: Sign in with Apple (needs the developer account), universal links so invite links
   open the app, a city list for guessing time zones (Kyoto, Florence and similar don't match
   an IANA zone name), editing the "Before you go" guides.
12. **Change email** (asked for Oct 16) on Account & settings: move the account to a new address
   (say to an @wrongtrain.lol one), keeping its trips. There are no passwords (sign-in is an
   emailed code), so this is the "change password" of WrongTrain. Supabase's `updateUser({ email })`
   sends a code to the new address to confirm it.
13. **Notes go straight through** (decided Oct 16; see VISION.md). Two parts: (a) a new shared
   trip starts on the Open rule, not Approve changes (`src/model/rules.ts`, `schema.sql`
   default); (b) the ideas box (`supabase/functions/_shared/filing.ts`) files everything it
   can place, including travel, bookings and times (legs, day plans, stays), instead of leaving
   them for the owner. It only leaves a note open when it truly can't tell what or where; for a
   chain with no city given ("muji, donqui, uniqlo") it picks the sensible spot and says so.
14. **Tapping a tab** (asked for Oct 16): the tapped button slides to the centre of the bottom
   bar, and the pages swipe quickly across to that page (now they glide slowly or jump).
   `TripApp` in `src/App.tsx`, the pager and bar scroll code.
15. **Three levels of say, picked when you create the trip** (Adam's idea, Oct 16). Ask on the
   new-trip and planner screens, in plain, funny words, then let the owner change it per person
   in Trip settings:
   1. "My friends are chill and know what they're doing": no approvals, anyone changes anything.
   2. "Some of these people shouldn't be allowed near the hotels": they can add ideas, places
      and notes, but can't remove things or change the itinerary (days, times, travel, stays)
      without the owner's OK.
   3. "My mother-in-law is trying to run this trip and nobody wants her to": zero control; they
      can look and leave notes, nothing else.
   Most of the machinery exists: the trip rule (Open / Approve changes / Approve everything in
   `src/model/rules.ts`) and roles (organizer / editor / viewer). The new parts: the choice at
   creation, these words, and a level per person (today the rule is per trip and only the role
   is per person), kept in agreement with `change_needs_approval` in `schema.sql`. Default is
   level 1, per item 13.
16. **A "Right now" page** (Adam's idea, Oct 16; to be fleshed out). Exactly what you need at
   this moment and nothing else, in big bold type, everything large and obvious. It is not
   always there: it shows up only within a window before something where details help, and
   goes away after. For example a train (platform, car, seats, which train), a flight (gate,
   terminal, flight number), a bus, or the next booking or meeting (its address, how to get
   there, when to leave). It shows whatever useful details the trip has for that thing, and
   the ticket when there is one. Builds on "How much time do I have?" on Today
   (`src/ui/next.tsx`, `src/model/next.ts`), the day's legs and plan items. When the window
   opens, the page opens by itself, and a "Right now" button appears in the bottom bar, to the
   left of Today; when nothing is happening, the button isn't there at all. To settle: how long
   the window is for each kind of thing, and how often it may open by itself (once per thing,
   so closing it sticks).

## Working together

Two people work on this at once: Adam (adam@thefreemans.io, the technical side) and Andrea
(andrea@thefreemans.io, design). So that neither overwrites the other:

- They use four commands (`.claude/skills/`) and don't need to know git:
  `/start <what>` begins a piece of work on its own branch, `/save` backs it up to GitHub,
  `/catchup` brings in the other person's finished work, `/done` checks it and adds it to `app`.
- Never commit straight to `app`; `/done` merges into it after the build and tests pass.
- Look and feel lives mostly in `src/index.css` and `src/ui/`.
- Design work needs only `npm run dev` in a browser; Xcode is only for putting it on a phone.
- One-time setup on each Mac, so Claude can push. In Terminal: `gh auth login` (GitHub.com,
  HTTPS, log in with a web browser, as your own GitHub account), then `gh auth setup-git`.
  No `gh`? `brew install gh` first, or download it from cli.github.com.

## Conventions

- Plain, specific wording in the UI and in comments; comments explain why.
- Commit as whoever is doing the work (their own name and @thefreemans.io email).
