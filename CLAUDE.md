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
  a note open when it can't tell what or where. A note asking for a kind of place without naming
  one ("get botox and a facial") gets a web search (`search` in the answer, `SEARCH_SYSTEM`) for a
  real one near where the group will be; the best is added as a place and fitted into the day it
  suits, with Undo. Places it adds get map pins straight away (`findPins` after filing).
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
- Photos (Photos tab, after Days; `PhotosPage` in `src/ui/photos.tsx`, `src/sync/photos.ts`): the
  whole group's photos by day or by person, also under each day. In the viewer people heart a
  photo (`photo_hearts`, once each), comment (`photo_comments`; the writer or an organizer
  removes one) and Share it through the phone's share sheet (Instagram, Messages, Save Image;
  `sharePath` in `src/sync/files.ts`). Hearts and comments are kept on the phone to show offline,
  but need signal to add. The sample has made-up ones. Not in the Japan edition.
- Oct 20: Something nearby sits under "Where to next?" on Today and looks nothing up until a mood
  is picked; Days no longer shows photos (the Photos tab has them); Add fits the page (Add photos,
  Add expense, Add place, Add travel, Add to-do; none on Phrases), and with no way to file (not
  shared or signed out) it opens the page's form; Map and Places show one city at a time
  (the one you're in), Map folded by kind, Places as category tiles; Transit folds each day, with
  only the next one open; open group notes fold away under "Open notes".
- Trip page (`TripHub` in `src/ui/trip.tsx`): the trip as a whole. Search; Who's going, everyone
  as a round picture with their name (joined people, then names on Who's going not joined yet,
  and a + to invite); the whole route; Before you go (the guides, `Guides` in `views.tsx`); what
  they speak there; Trip settings and Saved on this phone. All trips is in Account & settings.
- Oct 20, later: Right now's title and time in the accent yellow; Today says "What's nearby?"
  (the trip's own suggestion there was confusing); the line over the open tab is fixed over the
  middle of the bar (`.tabs::before`; on the tab it was cut off once the tab grew); one Add photos
  button (the round one); the viewer's Share is the share icon; wishlist places show under their
  own kind too; Wallet's button says Add document or Add expense to match (`useWalletSeg`).
- Plan items (`src/ui/planItem.tsx`): tap one on a day to edit it (words, day, times, booked,
  who's going; "Fits best on" suggests days by city and how full they are) or take it off. Who's
  going lives in `trip.going` (item id to names; none means everyone), free for anyone to change
  (`OPEN_KEYS` and `change_needs_approval`); under each item, faces when it isn't everyone and an
  I'm in / I'm out button. A day's getting-around notes fold away when it has legs.
- Notes tab (last; `src/ui/mynotes.tsx`): your own notes for the trip, on this phone only, and
  below them comments about the app for Adam (`app_feedback`, `src/sync/feedback.ts`: kind, text,
  build, phone; each person sees only their own; Adam reads them in Supabase's Table Editor).
- Photos: ☆ in the viewer keeps a photo in your favourites (on this phone); "★ Favourites" on the
  Photos page. Moving pages by the bottom bar blurs them by speed (`--mb`, `onBar` in App.tsx).
- Added Oct 20 (night): Dealt with notes list what they became (`note.made`); archiving trips (per
  phone, All trips list, `TripList` in App.tsx); budget per kind in the planner (`budgetBy`); mood
  icons; Translate something on Phrases (opens Google Translate); a Shopping tab (`src/model/shop.ts`:
  products and the Amazon tag, empty for now); What the AI has cost (over 1, 7, 14 or 30 days) in Account & settings, for Adam
  and Andrea only (`ai_costs` in schema.sql, `src/ui/costs.tsx`); tap a face on Trip to see the picture big.
- Update from the Google Sheet (Trip page, Japan 2026 trip only; `src/model/sheetSync.ts`): reads the
  Japan sheet with the page's name and passcode and three-way merges it in (base: what the sheet said
  last time, kept on the phone as pref `sheet-base-<trip id>`; the first time, the app's own trip kept
  to the items the sheet also has), so friends' additions come in and app-only things stay.
- Oct 22: the Days slider opens each day as it passes the middle, mid-drag (`DaySlider`); Right
  now's Show ticket also finds tickets attached elsewhere that day by a shared word in the name, and
  opens pictures and PDFs full screen in the app (`FileTicket`); favourite phrases move up and down.
- Phrases come in ten languages (`src/phrases`): Japanese (with recorded clips), Spanish, French,
  Italian, Portuguese (Portugal), German, Korean, Mandarin, Thai and Greek (the phone's voice), 55
  phrases each in the same groups. A new trip picks its pack from its stops' time zones
  (`packForZones`); a trip with none picked uses its first destination's country (`packForTrip`).
- Pull down to refresh (`src/ui/pull.ts`), on every page: fetches the trip, photos, hearts and comments
  (the Japan edition re-reads the sheet, event `wt-refresh`).
- Add anything (`src/ui/addAnything.tsx`): the round Add button above the bottom bar on every page
  but Right now (not in the Japan edition). Opens a box: type anything, it becomes a group note
  and, on a shared trip, is filed into the trip (`fileNote`), with what was filed and Undo shown
  in the box. Examples to tap for first-timers.
- Map (`src/ui/map.tsx`, `src/ui/form.tsx`): MapTiler tiles and lookups (`src/sync/maptiler.ts`;
  the key is public by design, limited to wrongtrain.lol, localhost and the app in MapTiler's
  dashboard). Places without coordinates (filed by Claude, made by the planner) get a pin when the
  Map page opens: the city is looked up first and a place's match (points of interest only, 90%+
  sure) must lie within 50 km of it; each place is tried once per phone.
- Profile pictures (`src/ui/avatar.tsx`): chosen on Account & settings, cropped and shrunk on the
  phone to a ~10 KB JPEG, kept on the phone and on each trip you're on (`trip_members.avatar`,
  readable only by people on that trip). Shown on the corner button, the people list and group
  notes (matched by name); initials in a coloured circle otherwise.
- The sample trip ("Explore a sample trip", `src/model/sample.ts`) demos everything: four made-up
  friends with pictures (`SAMPLE_PEOPLE`), two of them on the map (`sampleSpots`), photos
  (drawings in `public/sample/`), Claude's filed notes, tickets, a booking and insurance in the
  Wallet (pictures, opened in the app by `PictureView`), expenses in yen and dollars with
  settling up, and a Right now train that always leaves about 35 minutes after you look
  (`freshenSample`, leg `l-now`; Right now doesn't open by itself in the sample). An older saved
  sample without these is replaced when the app loads.
- Added Oct 17 (overnight): Wallet → Money has a currency converter (rates both ways, typed
  either way, kept for offline) and payments made stay in Settle up stamped PAID; Wallet files that
  are pictures or PDFs open in the app (`PictureView`) with thumbnails; the tab order is Today, Days,
  Map, Places, Transit, Wallet, Phrases, To do, Trip; Trip settings has a Last day and, for the
  owner of a shared trip, "Delete this trip for everyone" (`delete_trip`); invite codes can be
  cancelled (`list_invites`, `cancel_invite`) and people who join are added to Who's going
  (`join_trip`); to-dos can be personal, a group check (each person ticks their own) and tagged
  (book, buy, call, email, fill out; `src/model/todos.ts`); the planner takes a budget range and
  its cards are calmer and swipeable; "What they speak there" on Trip and Phrases
  (`src/model/languages.ts`); a profile photo is moved and zoomed in a circle before it's used;
  Trip shows "Saved on this phone" with a save-a-copy-as-a-file button (`saveTripCopy`).
  Later on Oct 17: a tapped tab glides quickly to the middle of the bar with its page (`glide` in
  `src/App.tsx`); Phrases' categories wrap instead of scrolling sideways (a sideways strip caught
  the page swipe and bounced); the writer of a group note can edit it (`editNote`).
- Trip files: "Open a trip file" on the welcome screen reads a trip saved as JSON
  (`src/model/tripFile.ts`); opening a newer file of the same trip updates it and keeps ticks,
  notes and the wallet. `node legacy/to-app.mjs` turns the Japan 2026 sheet into one (it asks
  for your Japan page name and passcode and saves to the Desktop; run it again after sheet
  changes). The file holds booking numbers and logins: never put it in the repo.

- Testing the planner cheaply: test mode (replays a saved plan; a switch on the
  planner's first page and in Account & settings while the app is invite-only; `canTest` in
  `src/sync/planner.ts`, set it to `import.meta.env.DEV` before launch), `plan_cache`, and the
  `PLANNER_MODEL` (now `claude-haiku-5-5`) and `PLAN_TESTERS` secrets; see
  `app/supabase/functions/README.md`. **Before launch:** delete `PLANNER_MODEL` (back to the best model) and hide test mode.

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

Nothing right now. Oct 17: schema.sql run (through the per-person AI limits), a monthly spend limit set in the Anthropic console, the three
Claude functions deployed, the change-email template set ("Secure email change" is off: the app
asks for the new address's code only), MapTiler key in.

## Where things stand (Oct 17, 2026)

Done: trip model, sample trip, all screens, trip editor, sharing (invite codes, live sync,
offline queue), email sign-in, iOS project with icon and launch screen, first build running on
the iPhone, owner approvals (trip rule, roles, requests and the approval list), the ideas box
(Claude files group notes; not deployed yet).

Next:
4. **TestFlight**: the developer account (team "Adam Freeman", GXSV7T4V36) and App Store Connect
   are set up (Oct 22). The app's store name is **WrongTrain.lol** ("WrongTrain" was taken; the name
   under the icon stays WrongTrain), bundle id `lol.wrongtrain.app`. Next: upload a build (Product →
   Archive → Distribute App), then internal testers, then an external group for friends (Beta App
   Review on the first build).
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
11. Later: Sign in with Apple (needs the developer account), universal links so invite links
   open the app, a city list for guessing time zones (Kyoto, Florence and similar don't match
   an IANA zone name), editing the "Before you go" guides.
16. **Right now, next steps** (first version built Oct 16; see "Right now" above). For Andrea: the
   look (it's Adam's quick take: huge time, leave-by box, big ticket and directions buttons). Then:
   live platforms and gates (needs a train or flight info service), a "get there" step list,
   a notification when it opens with the app closed (needs the iOS app and push).
19. **Freemium and how to pay for the AI** (asked for Oct 16; to discuss before building).
   Claude calls cost real money (planner, ideas box, Something nearby). Options to weigh: a free
   tier with limits plus a per-trip pass (`trip_passes` exists), a subscription, or both, and
   affiliate income (VISION.md). Decide which features are paid. Also: how many AI trip plans
   come free (today the cap is 5 a month per person, in `claim_plan`); one free plan, then paid?

32. **Adding things, next steps** (first version built Oct 17: the round **Add** button on every
   page but Right now, `src/ui/addAnything.tsx`; what you type is filed like a group note and kept
   on the To do tab). For Andrea: its look and place. Ideas: voice input, a photo of a booking
   email or ticket, sharing to WrongTrain from other apps (needs the iOS app's share extension).
34. **Referral links, done well** (VISION.md, `src/model/partners.ts`): get the partner ids in
   (Airalo via Impact, Viator, Klook, SafetyWing, Booking.com), and show genuinely useful
   suggestions where they help (an eSIM before you fly, a rail pass on a train-heavy trip, tours
   for an idle afternoon, a hotel on a night with no stay) rather than ads. Rules to keep it
   honest: always labelled, never only paid options (show the best choice even when it pays
   nothing), never ranked by commission.
36. **The logo** (for Andrea): the simple line logo feels a bit like a gummy worm. Try it on a
   diagonal, and see whether it says "trip" and "train" enough on its own. Then put it in the app:
   on the welcome screen (it only shows the word "WrongTrain" today), the loading screen,
   Account & settings, and anywhere else the brand should show.
37. **A new tagline** (Adam: "Every trip is a line" isn't for him). It's the welcome screen's
   heading (`Welcome` in `src/App.tsx`). Find one that says what WrongTrain does for a group of
   friends (see VISION.md), with Andrea.
38. **The profile button sits in odd spots** (Adam, on the phone). It floats in the top-right
   corner of each page (`.acctbtn` in `src/index.css`, `AccountButton` in `src/ui/account.tsx`),
   over whatever header that page has, and is missing on Days. Give it one fixed home that every
   page leaves room for (or a place in the bottom bar), with Andrea.
43. **Better words for the levels of say** (Adam: neither the phrases nor their descriptions are
   right yet). `LEVELS` in `src/model/rules.ts`; with Andrea.
47. **The last referral id**: the Booking.com aid (then a Booking.com link for stays, see 50). Airalo
   declined (Oct 20): its eSIM link goes out plain, with no referral.
50. **A Stay page**: each night's hotel with photos, check-in and check-out times, amenities, tips,
   address and directions, and a booking link for the recommended ones (a referral where one
   exists, see 34).
52. **Line symbols and live transit** (Adam): show each train or metro line the way the city does:
   Tokyo's coloured circles with a letter (Ginza line: orange "G", stations "G09"), Seoul and
   Taipei's coloured line codes, Paris's numbered circles, London's line colours, New York's
   coloured letter and number bullets. Most transit data carries a line's short name and colours
   (GTFS route_short_name, route_color, route_text_color). For live routes on Right now (which
   line, which direction, stops, departure): Google's Routes API with transit gives line names,
   colours and vehicle icons, but its terms likely require showing it with a Google map (we use
   OpenStreetMap / MapTiler), so check that first. Alternatives: open routing on GTFS data
   (Transitous / MOTIS), HERE Public Transit, and in Japan NAVITIME or Ekispert, which also know
   platform numbers.
56. **Something nearby, more prominent, with ratings**: give it a bigger place (its own tab or the
   top of Today), and show ratings. Google ratings come from the Places API (paid per request;
   its terms require Google's attribution, and Google data shown on a map must be on a Google
   map, so in a list is fine). Alternatives: Foursquare or Yelp ratings.
63. **Real-time flight alerts** (Adam, Oct 20): delays, gate and terminal changes and
   cancellations for the trip's booked flights, as they happen (needs a flight status service and,
   with the app closed, push notifications; see Right now, 16).
68. **Our own icons instead of emojis** (Adam, Oct 20): replace the emojis used as icons everywhere
   (Places category tiles, Something nearby moods, the planner's choices, stars and hearts) with a
   custom icon set in WrongTrain's style, like the bottom bar's line icons. With Andrea.

## Working together

Two people work on this at once: Adam (adam@thefreemans.io, the technical side) and Andrea
(andrea@thefreemans.io, design). So that neither overwrites the other:

- They use four commands (`.claude/skills/`) and don't need to know git:
  `/start <what>` begins a piece of work on its own branch, `/save` backs it up to GitHub,
  `/catchup` brings in the other person's finished work, `/done` checks it and adds it to `app`.
  `/todo <what>` just adds something to the to-do list (here and on the sheet), without working on it.
- Never commit straight to `app`; `/done` merges into it after the build and tests pass.
- **The project sheet** ("WrongTrain project: to-dos, changelog, accounts"; also has the
  Accounts list of every service and the Working together steps; never passwords or keys,
  which go in 1Password: https://docs.google.com/spreadsheets/d/1PpEdGILeWLNULUx0Iaor2YOd6S4gfaMA88Gd5K2aYWY/edit) mirrors
  the to-do list above and records every change. Keep it up to date as part of the work, without
  being asked: a new to-do gets a row on To-dos (Status Open); when one is finished, set its Status
  to Done and fill in "Done on" (never delete rows; Done rows strike through by themselves); every
  change added to `app`, every publish to wrongtrain.lol, every change to the Japan sheet and every
  phone build gets a row at the top of Changelog (date and time, build number, what, short details,
  who, where). Use the Google Sheets connector; if it isn't connected, say so and list the rows to add.
- Look and feel lives mostly in `src/index.css` and `src/ui/`.
- Design work needs only `npm run dev` in a browser; Xcode is only for putting it on a phone.
- One-time setup on each Mac, so Claude can push. In Terminal: `gh auth login` (GitHub.com,
  HTTPS, log in with a web browser, as your own GitHub account), then `gh auth setup-git`.
  No `gh`? `brew install gh` first, or download it from cli.github.com.

## Conventions

- Plain, specific wording in the UI and in comments; comments explain why.
- Commit as whoever is doing the work (their own name and @thefreemans.io email).
