# WrongTrain

A group trip planner, heading for the iOS App Store. Made for millennials travelling without kids
(child-free is the default and a selling point): Claude's prompts assume adults who would rather
avoid family resorts and kids' places. It began as the Japan 2026 page at
wrongtrain.lol, a single HTML file reading the trip from a Google Sheet.

**Read `VISION.md` first**: who the app is for and what it should become.

## Branches: be careful with `main`

- **`main` is the live website** (GitHub Pages, custom domain wrongtrain.lol):
  - `/` is the **Japan edition of the app** (since Oct 16, 2026), in real use for the Japan
    trip from Oct 26 to Nov 8, 2026: `index.html`, `assets/`, `japan-sw.js` + `sw.js` (the same
    offline worker; `sw.js` is the old page's worker name, so phones that had it move over),
    `precache.json`, `phrases/`. It must keep working with no signal; don't change it without asking.
  - `/classic/` is the **old Japan page** (single HTML file, its own `sw.js`), kept as the
    backup. To switch back: copy `classic/index.html`, `classic/sw.js` and
    `classic/phrases-audio.json` to the root.
  - `/japan/` sends anyone with the test link on to `/`.
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
- Levels of say (`src/model/rules.ts`): each person is an organizer, an editor ("can change
  anything"), a contributor ("can add ideas"; plan changes become requests, approved or denied on
  the To do tab) or a viewer ("look and leave notes"). The level people join with is picked when
  the trip is made, in funny words ("My friends are chill...", `SayPicker`), and is the trip's
  rule online; default "can change anything". The owner changes anyone's level in Trip settings.
  `rules.ts` and `change_needs_approval` in `schema.sql` must agree. Database checks:
  `supabase/test/rules.sql` (runs on a local Postgres, or on PGlite in Node).
- The ideas box files everything: places, to-dos, plan items and changes to them, travel and
  stays (`supabase/functions/_shared/filing.ts`, applied in `src/model/filing.ts`). It only leaves
  a note open when it can't tell what or where.
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
  `src/ui/account.tsx`). Sign in/out, change email (a code to the new address), your name, Appearance (`src/ui/theme.tsx`) and the build
  number and time (set in `vite.config.ts`), so you can tell whether a phone has the latest.

- Right now (`src/model/rightNow.ts`, `src/ui/rightnow.tsx`): during the trip, only while
  something is about to happen: from about 3 hours before a booked flight, 45 minutes before you
  need to leave for a booked train or bus, 30 minutes before you need to leave for a fixed
  booking; it closes 10 to 20 minutes after. Then a "Right now" tab appears left of Today and the
  page opens by itself once per thing, with the time in huge type, when to leave (travel from
  where you are), the service, seats and details, and big Show ticket and Directions buttons.
  Not for the sample trip (it would come and go with the clock).
- Where everyone is (Map → "Where everyone is", `src/sync/locations.ts`, `FriendFinder` in
  `src/ui/map.tsx`): on a shared trip, each person may share where they are for a time they pick
  (1 hour, 4 hours, rest of today, whole trip); while it lasts and the app is open, location stays
  on and is sent every minute or after 30 m (`trip_locations`, written only through
  `share_location`, seen only by people on the trip and only until then). Friends show on the map
  with their picture, in a list with distance and directions. Not in the Japan edition.
- Profile pictures (`src/ui/avatar.tsx`): chosen on Account & settings, cropped and shrunk on the
  phone to a ~10 KB JPEG, kept on the phone and on each trip you're on (`trip_members.avatar`,
  readable only by people on that trip). Shown on the corner button, the people list and group
  notes (matched by name); initials in a coloured circle otherwise.
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

## The Japan edition at wrongtrain.lol/japan/

The app, built for the Japan 2026 group: `npm run build:japan` (into `dist-japan/`, with
`VITE_EDITION=japan` from `.env.japan`; `src/edition.ts`). It signs in with the Japan page's name
and passcode, reads the trip live from the Google Sheet through the same Apps Script web app and
the page's own parser (`src/sheet/live.ts`, `src/sheet/sheetTrip.js`, the `virtual:parse-trip`
module in `vite.config.ts`), refreshes every few minutes, and sends ticks and group notes back to
the sheet. The plan is changed in the sheet: Edit buttons say so (`SheetOnly` in `src/ui/japan.tsx`).
No Wallet tab and no shared-trip sync. Works offline through `public/japan-sw.js`. Tested by
`e2e/japan.mjs`, which plays the sheet's script.

To publish: build it on `app` (`npm run build:japan`), then on `main` replace the site root's
`index.html`, `assets/`, `japan-sw.js`, `precache.json`, `favicon.svg` and `phrases/` with those
from `app/dist-japan/`, and copy `japan-sw.js` over `sw.js` too. Leave `CNAME`, `app/`,
`classic/` and `japan/` alone. People coming from the old page keep their sign-in and saved trip
(`oldPageTrip` in `src/sheet/live.ts`).

The sheet's own script (Code.gs, and Filer.gs, which files each group note within a minute) is
kept in `legacy/apps-script/`; the running copy lives in the sheet.

## Publishing the test copy at wrongtrain.lol/app/

Build on the `app` branch, then on `main` replace the `app/` folder with `app/dist/` and push.
Touch nothing else on `main`. GitHub Pages updates within a couple of minutes.

## Waiting to be switched on (Adam, when ready; not now)

Built and tested, but they need the website-account steps before they work on shared trips:
- Run the updated `schema.sql` in Supabase (levels of say, profile pictures, where everyone is; also item 1 below).
- Deploy the ideas box (`file-note`; item 2 below).
- Change email (Account & settings → Change email, `ChangeEmailSheet` in `src/ui/account.tsx`):
  in Supabase, Authentication → Emails → "Change email address", make the message show the code
  (`{{ .Token }}`), like the sign-in email, and keep "Secure email change" on.

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
14. **Tapping a tab** (asked for Oct 16): the tapped button slides to the centre of the bottom
   bar, and the pages swipe quickly across to that page (now they glide slowly or jump).
   `TripApp` in `src/App.tsx`, the pager and bar scroll code.
16. **Right now, next steps** (first version built Oct 16; see "Right now" above). For Andrea: the
   look (it's Adam's quick take: huge time, leave-by box, big ticket and directions buttons). Then:
   live platforms and gates (needs a train or flight info service), a "get there" step list,
   a notification when it opens with the app closed (needs the iOS app and push).
17. **A photo section** (asked for Oct 16): one place for the whole group's photos from the trip
   (today they sit under each day, `src/ui/photos.tsx`, rows in `trip_photos`): browse by day or
   person, see who added what, save to your phone.
19. **Freemium and how to pay for the AI** (asked for Oct 16; to discuss before building).
   Claude calls cost real money (planner, ideas box, Something nearby). Options to weigh: a free
   tier with limits plus a per-trip pass (`trip_passes` exists), a subscription, or both, and
   affiliate income (VISION.md). Decide which features are paid. Also: how many AI trip plans
   come free (today the cap is 5 a month per person, in `claim_plan`); one free plan, then paid?
20. **Cancel an invite** (asked for Oct 16): removing someone who has joined already works
   (People and sharing, `removeMember`); also let the owner cancel an invite code nobody has
   used yet, so a forwarded link stops working.
21. **Nobody uses WrongTrain as free Claude on our key** (asked for Oct 16). Today: AI runs only in
   Edge Functions with fixed jobs (file a note, plan a trip, pick nearby places), each with a
   structured answer, and uses are capped (`ai_uses` per trip, `ai_plans` per person per 30
   days). Before launch: review every function for prompt injection (a note or trip text that
   tries to make Claude do other work), cap input sizes, rate-limit per person as well as per
   trip, and set a monthly spend alert and hard limit in the Anthropic console.

22. **Rethink the Trip page** (Adam, Oct 16: "makes no sense"). Move "All trips" into Account &
   settings. Decide what Trip is for once Places, Photos, Notes and settings have homes of their own.
23. **Places, broken down**: pick a category (with icons, like "Something nearby") and a
   location, instead of one long overwhelming list; for food, types of food (icons would do).
24. **"Something nearby" moods**: "Coffee & cake" becomes just "Coffee"; an icon for each mood.
25. **Photos as their own page**, with comments and hearts (builds on 17).
26. **Tab order**: Wallet goes between Transit and Phrases.
27. **Currency converter in Wallet → Money** (also in 9), showing the rate plainly both ways, e.g.
   "¥1,000 = $6.70" and "$10 = ¥1,493", big enough to read at a till.
28. **Trip settings: first and last day** shown and changeable there.
29. **"Who's going" fills itself**: today it's names typed in Trip settings, used to split money,
   and it doesn't grow when someone joins with a code. Add people who join automatically (their
   name on the trip), keep it editable, and explain what it's for on the page.
30. **Wallet files**: a photo saved as an ID opened the iOS share menu instead of showing the
   picture. Show images (and PDFs) in the app; thumbnails for each item; a bigger Open button.
   `openFile` in `src/sync/files.ts`, `src/ui/wallet.tsx`.
31. **To-do kinds**: personal to-dos (just mine) and group checks (everyone ticks their own, and
   you see who has: "Visit Japan Web", "get yen"), plus coloured tags for the kind of to-do:
   book, buy, call, email, fill out.
32. **Adding things should be the star** (Adam: a big feature is "add anything and it lands in the
   right place"). Today it's tucked into To do as Group notes. Give it its own page or a
   prominent way in from everywhere (see VISION.md, "Just say it").
33. **Save to phone, prominently**: the trip already works offline, but people don't know; make
   "saved on this phone" visible and offer a clear Save-to-phone action on the trip (also files,
   tickets).
34. **Referral links, done well** (VISION.md, `src/model/partners.ts`): get the partner ids in
   (Airalo via Impact, Viator, Klook, SafetyWing, Booking.com), and show genuinely useful
   suggestions where they help (an eSIM before you fly, a rail pass on a train-heavy trip, tours
   for an idle afternoon, a hotel on a night with no stay) rather than ads. Rules to keep it
   honest: always labelled, never only paid options (show the best choice even when it pays
   nothing), never ranked by commission.
35. **Deleting trips, clearly**: today "Delete this trip" is only in Trip settings, and only for a
   trip that isn't shared (a shared one has "Leave"). Make it easy to find (e.g. from All trips),
   and for a shared trip let the owner delete it for everyone, with a clear warning.
36. **The logo** (for Andrea): the simple line logo feels a bit like a gummy worm. Try it on a
   diagonal, and see whether it says "trip" and "train" enough on its own.
37. **A new tagline** (Adam: "Every trip is a line" isn't for him). It's the welcome screen's
   heading (`Welcome` in `src/App.tsx`). Find one that says what WrongTrain does for a group of
   friends (see VISION.md), with Andrea.

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
