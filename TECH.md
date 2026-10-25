# WrongTrain: how it works and how it's built

The technical guide to WrongTrain, as of build 186 (Oct 25, 2026). Read `VISION.md` for who it's for
and where it's going, and `CLAUDE.md` for the running list of features and to-dos. This document
explains the parts and how they fit together, so someone new (or Claude in a new session) can find
their way around and change things safely.

## Contents

1. [The big picture](#1-the-big-picture)
2. [Where things live](#2-where-things-live)
3. [The app](#3-the-app)
4. [The trip data model](#4-the-trip-data-model)
5. [Saving on the phone](#5-saving-on-the-phone)
6. [Sharing and sync](#6-sharing-and-sync)
7. [Who can change what](#7-who-can-change-what)
8. [Files, photos and documents](#8-files-photos-and-documents)
9. [The AI parts](#9-the-ai-parts)
10. [Other outside services](#10-other-outside-services)
11. [The iPhone and iPad app](#11-the-iphone-and-ipad-app)
12. [Notifications](#12-notifications)
13. [Editions: the app, the Japan edition, the website](#13-editions-the-app-the-japan-edition-the-website)
14. [Testing](#14-testing)
15. [Building and releasing](#15-building-and-releasing)
16. [Security](#16-security)
17. [Costs and limits](#17-costs-and-limits)
18. [Running it: common jobs](#18-running-it-common-jobs)
19. [Known gaps and next technical steps](#19-known-gaps-and-next-technical-steps)

---

## 1. The big picture

WrongTrain is one web app (React + TypeScript, built with Vite) that runs in three places:

- **The iPhone and iPad app**: the web app inside a native shell (Capacitor 8), with a few native
  extras written in Swift (camera text, translation, Apple's on-device AI, notifications).
- **A browser**: the same build at `wrongtrain.lol/app/` (Android friends use this).
- **The Japan edition** at `wrongtrain.lol/japan/`: the same code built with a switch that reads
  the Japan 2026 trip from a Google Sheet instead of the app's own sharing.

Everything about a trip lives **on the phone first**, in one JSON record, so the app opens instantly
and works with no signal. When a trip is **shared**, a copy lives in **Supabase** (a hosted Postgres
database with sign-in, file storage, live updates and server functions). Phones merge each other's
changes, three-way, like git.

**Claude** (Anthropic's API) does the "smart" jobs: filing notes, planning trips, picking nearby
places, finding hotel details. It is only ever called from Supabase server functions, never from the
app, so the API key never reaches a phone. Cheaper or free paths are tried first: Apple's on-device
model on newer iPhones, and free map data (OpenStreetMap, MapTiler).

```
 iPhone / iPad (Capacitor)        Browser (wrongtrain.lol/app)
          \                              /
           \____ same React app ________/
                 |  localStorage (+ iOS Preferences backup)
                 |
                 v  (shared trips, sign-in, files, photos)
        Supabase: Postgres + Auth + Storage + Realtime
                 |
                 v  (Edge Functions, Deno)
     file-note · plan-trip · suggest-nearby · place-details · send-push
           |                                              |
           v                                              v
     Anthropic API (Claude)                     Apple Push (APNs)
```

## 2. Where things live

| Thing | Where |
|---|---|
| Code | GitHub, one repo. Branch `app` is where WrongTrain is developed; `main` is the live website. |
| The app's source | `app/` on the `app` branch |
| Website (marketing, privacy, terms) | `site/` on `app`, copied to the root of `main` |
| Japan page source and old scripts | `legacy/` |
| Database, server functions | Supabase project `wklwpihkpiuniazhidjz` |
| Hosting | GitHub Pages from `main`, domain `wrongtrain.lol` |
| iOS distribution | App Store Connect / TestFlight, app "WrongTrain.lol", bundle `lol.wrongtrain.app`, team GXSV7T4V36 |
| To-dos, changelog, accounts list | The project Google Sheet (link in `CLAUDE.md`) |
| Passwords and keys | 1Password only. Never in the repo, the sheet or chat. |

On `main`:

- `/` is the website.
- `/app/` is a browser copy of the app build.
- `/japan/` is the Japan edition.
- `/classic/` is the old single-page Japan site, kept as a backup.

## 3. The app

`app/src/` is split by job:

| Folder | What's in it |
|---|---|
| `model/` | Pure TypeScript, no UI: the trip types, every edit, merging, rules, money, time, search, the planner's trip-maker, the sample trip, and the store that holds state on the phone. Almost all unit tests are here. |
| `sync/` | Everything that talks to the outside: Supabase (`engine.ts`), files, photos, locations, push, the AI functions, MapTiler, OpenStreetMap, exchange rates, and the native bridge (`apple.ts`). |
| `ui/` | The screens and sheets (React components). |
| `phrases/` | Phrase packs in ten languages. Japanese has recorded clips (`public/phrases/ja.json`). |
| `sheet/` | Japan edition only: reading the trip from the Google Sheet. |

**Entry points:**

- `main.tsx` starts things.
- `App.tsx` holds the shell: the welcome screen, the trip list, and the bottom bar or (on wide
  screens) the sidebar. It also holds every page, kept mounted side by side so swiping between them
  is instant.
- `ui/ctx.tsx` defines the context every screen reads:
  - `ix`: the open trip, indexed;
  - `now`: before, during or after the trip, and today;
  - `ui`: the open tab, filters;
  - `go` and `set`: to move between pages and change filters;
  - `geo`: location;
  - `me`: your name;
  - `edit`: opens an editor sheet;
  - `show`: opens a thing's details card.

**Tabs** (`MAIN_TABS` in `ui/ctx.tsx`): Today, Days, Essentials, Photos, Map, Places, Wallet,
Phrases, To do, Trip, Notes, plus **Right now**, which appears only while something is about to
happen. Shopping is built but hidden.

**Screens worth knowing:**

- **Today** (`views.tsx` `Today`, `next.tsx` `NextCard`) is the hub.
  - During the trip it shows how much time you have, then Coming up (each item opens its details
    card) with tonight's hotel, Change of plans?, Waiting on you, What's nearby, and the day's plan.
  - Before the trip it shows a countdown, the weather, Getting there and the first to-dos.
- **The details card** (`ui/details.tsx`) is one look for anything you can tap: a place or hotel, a
  leg of travel, or a plan item. It's opened by `show({ kind, id })` from anywhere. Places also get
  **Add to itinerary** (`ui/addToPlan.tsx`, `model/fit.ts`).
- **Essentials** (`ui/essentials.tsx`): hotels, travel, reservations and emergency numbers as
  one-line rows that open the card. It also fills in missing addresses and phones (see 9 and 10).
- **Right now** (`model/rightNow.ts`, `ui/rightnow.tsx`): from about 3 hours before a booked flight,
  45 minutes before you need to leave for a booked train, or 30 minutes before you need to leave for
  a booking. The time is in huge type, with when to leave, Show ticket and Directions.
- **Editors** (`ui/editors.tsx`, `ui/planItem.tsx`): every change goes through a sheet that calls a
  pure function in `model/edit.ts`.

**Style:** almost all look and feel is in `src/index.css`. Colours and dark/light are CSS variables.
From 760 px wide a sidebar replaces the bottom bar; from 1080 px some pages go to two columns.

## 4. The trip data model

A trip is one plain JSON object (`model/types.ts`):

```
Trip
├─ name, travelers[] (names), currency, phrasePack, createdAt/updatedAt
├─ destinations[]  (city, country, time zone, line colour)
├─ days[]          (always consecutive dates)
│   └─ destinationId or route[], stayId (tonight's hotel), travel?, plan[] (PlanItem),
│      eatIds[], around[] / tips[] (notes), summary
├─ legs[]          (flights, trains, buses…: from, to, mode, depart/arrive, status, tickets)
├─ places[]        (hotels, food, sights…: kind, pin, address, phone, hours, booking, check-in/out)
├─ todos[], todoGroups[]  (who it's for, ticks per person, tags, Remind)
├─ notes[]         (group notes; the ideas box)
├─ going{}         (plan item id → names; none = everyone)
├─ docs[]          (shared tickets and bookings; private IDs are kept apart)
├─ expenses[], settlements[], venmo{}
└─ guides[]        ("Before you go")
```

**Rules that keep it sane:**

- **Every change is a pure function** in `model/edit.ts` (tested in `edit.test.ts`). The UI never
  edits the trip object directly. It calls `patchTrip(id, t => someEdit(t, …))`.
- **Days are always consecutive.** Inserting or removing a day re-dates the ones after it.
- **Clock times are local "HH:MM" strings and dates are "YYYY-MM-DD".** Nothing depends on the phone's
  own time zone. `model/time.ts` converts using each destination's IANA zone.
- **People are matched by name** (travelers, going, todo `who`, money). That's simple, but it's a
  known weakness (see 16).

## 5. Saving on the phone

- `model/store.ts` keeps all state in **one localStorage record** (`wrongtrain`): the trips, which
  is open, your name, and the sync state of each shared trip. Small preferences live under
  `wt-pref-*`.
- iOS can clear a web view's localStorage when space is low. So in the app every save is also
  written to native storage (Capacitor Preferences), and copied back on start-up if it went missing
  (`native.ts`).
- Private documents (passports, IDs) live apart in `wt-private-docs` and are **never uploaded**
  (`model/privateDocs.ts`).
- Files (tickets, photos) are kept on the phone for offline use (`sync/files.ts`).
- **Trip files:** a trip can be saved to and opened from a JSON file (`model/tripFile.ts`). Opening a
  newer file of the same trip updates it and keeps ticks, notes and the wallet.

## 6. Sharing and sync

**Sign-in:** Supabase Auth with an emailed code (no passwords).

- The emails are branded HTML (`supabase/emails/emails.py`), sent from `info@wrongtrain.lol`
  through Gmail SMTP.
- Signed in, every trip you make is saved to your account (`saveToAccount`), so it appears on all
  your devices. It's shared with nobody until you invite them.

**Database tables** (`app/supabase/schema.sql`, safe to run again; it's the single source of truth):

| Table | What it holds |
|---|---|
| `trips` | One row per shared trip: `data` (the whole Trip JSON), `version`, `owner`, `rule` |
| `trip_members` | Who's on it: user, name, role, profile picture |
| `invites` | 8-letter join codes (30 days) |
| `trip_removed` | People taken off a trip (old codes can't bring them back) |
| `trip_requests` | Changes waiting for the owner's OK |
| `trip_docs_limited` | Documents shared with only some people |
| `trip_photos`, `photo_hearts`, `photo_comments` | The group's photos |
| `trip_locations` | Who's where? (live locations, only while someone chooses to share) |
| `push_tokens`, `push_sent` | Phones to notify, and what was sent (no repeats, rate limit) |
| `app_feedback` | Comments for Adam from the Notes tab |
| `ai_uses`, `ai_plans`, `trip_passes`, `plan_cache`, `function_errors` | AI counting, the future paid pass, cached plans, errors |

Every table has row-level security. People see only trips they're on. Writes to `trips` and
`trip_members` go only through **security-definer functions** (`share_trip`, `save_trip`,
`join_trip`, `create_invite`, `remove_member`, `set_member_role`, `request_change`, `decide_request`
and the rest), each checking who's calling.

**How a save works** (`sync/engine.ts`, `sync/core.ts`, `model/merge.ts`):

1. Each phone remembers the server version its copy is based on, plus that base copy.
2. A change is saved locally at once and marked dirty. When there's signal, the phone calls
   `save_trip(id, data, base_version)`.
3. If someone else saved first, the server says so (-1). The phone fetches theirs and does a
   **three-way merge** (base, mine, theirs) item by item, by id, then tries again.
4. Other people's saves arrive live (Supabase Realtime) and go through the same `receive()` logic.
5. With no signal, changes queue and go out later. Pull down to refresh on any page.

## 7. Who can change what

There are four **levels of say** (`model/rules.ts`):

| Level | What they can do |
|---|---|
| Organizer | Approves requests |
| Editor | Can change anything |
| Contributor | Can add ideas; plan changes become requests |
| Viewer | Looks and leaves notes |

The owner is above all of them. Each trip also has a **rule** (open, approve changes, or approve
everything), which sets the level people join with.

- The **same rule runs twice**: in the app (`rules.ts`, to know whether to save or send a request)
  and in the database (`change_needs_approval` in `schema.sql`, on every save). **They must agree.**
  Change both together and run `supabase/test/rules.sql`.
- Some parts are free for everyone (`OPEN_KEYS`): ticks, "I'm in/out", notes.
- Requests are listed on To do, where the owner or an organizer approves or denies them
  (`ui/requests.tsx`).
- Only owners, organizers and editors can make invite codes.

## 8. Files, photos and documents

- **Storage:** one private bucket, `trip-files`, organised by folder:

  | Folder | What goes there |
  |---|---|
  | `<trip id>/…` | Shared files: tickets, bookings, receipts, note screenshots, photos |
  | `<trip id>/limited/<doc id>/` | Documents shared with only some people. The storage rule checks `can_see_doc`. |
  | `private/…` | Never uploaded. Private IDs stay on the phone. |

- **Pictures and PDFs** open full screen in the app (`ui/picture.tsx`), with pinch to zoom.
- **Profile pictures** are cropped and shrunk on the phone to about 10 KB. They're stored on each
  trip you're on (`trip_members.avatar`) and on your account.

## 9. The AI parts

All Claude calls run in **Supabase Edge Functions** (Deno, `app/supabase/functions/`). The prompts
and answer shapes are in `_shared/`. The Anthropic key is only a Supabase secret
(`ANTHROPIC_API_KEY`).

| Function | What it does | Model | Called from |
|---|---|---|---|
| `file-note` | Files a group note (or the Add box) into the trip: places, to-dos, plan items, travel, stays. It reads attached screenshots and PDFs, and searches the web when a note asks for a kind of place without naming one. | Haiku 5.5 (+ web search) | `sync/filing.ts` |
| `plan-trip` | "Plan a trip for me": an outline, then web research and a day plan for each city. Steps are claimed against the plan before Claude is asked. Answers are cached in `plan_cache`. | `PLANNER_MODEL` secret, else Sonnet 5.5 (now set to Haiku 5.5 for testing) | `sync/planner.ts` |
| `suggest-nearby` | Picks the best 5 of the nearby places for a mood, and says why | Haiku 5.5 | `sync/nearby.ts` |
| `place-details` | "Find the rest online": addresses, phones and websites for hotels and bookings, 3 at a time | Haiku 5.5 (+ web search) | `sync/details.ts` |

**Every function follows the same pattern:**

1. Check the caller's sign-in token.
2. Read the trip **as the caller** (so the database decides whether they're on it).
3. Count a use (`claim_ai_use` / `claim_plan`).
4. Call Claude with a **fixed job and a structured answer** (JSON schema).
5. Check the answer, and refund the use if Claude failed.
6. Log errors to `function_errors`.

The app then applies the answer through the normal edit functions and `patchTrip`, so the trip
rule still applies, and shows Undo.

**Cheaper paths first:**

- **Apple's on-device model** (Foundation Models, iOS 26+ with Apple Intelligence) does small jobs
  for free on the phone: picking nearby places, and filing a plain task or one named place
  (`model/quickFile.ts` decides; anything with a day, time, booking or search goes to Claude).
- **Free map data** fills addresses and phones on its own before Claude is ever asked (see 10).
- **Translation** runs on the phone (Apple Translation), with Google Translate in a browser.

## 10. Other outside services

| Service | Used for | Key |
|---|---|---|
| **MapTiler** | Map tiles, geocoding, reverse geocoding (pins for places Claude or the planner add) | Public by design, limited to wrongtrain.lol, localhost and the app |
| **OpenStreetMap (Overpass)** | What's nearby, Change of plans, free place details | None. Public server: slow at times, not for heavy use. |
| **Open-Meteo** | Weather on Today and the 7-day view | None |
| **Frankfurter** (exchange rates) | Wallet's currency converter (kept for offline) | None |
| **Gmail SMTP** | Sign-in and welcome emails | In Supabase settings |
| **Apple APNs** | Push notifications | Supabase secrets `APNS_KEY`, `APNS_KEY_ID` |
| **Referral partners** | Viator, Klook, SafetyWing (`model/partners.ts`) | Ids in code, public |

## 11. The iPhone and iPad app

- **Capacitor 8**, Swift Package Manager (no CocoaPods), project in `app/ios/`. It runs on iPhone
  and iPad (`TARGETED_DEVICE_FAMILY = 1,2`).
- **Plugins:** app, browser, filesystem, geolocation, local and push notifications, preferences,
  share, splash screen and status bar.
- **Our own native code** (`ios/App/App/WrongTrainNative.swift`, registered by
  `WTBridgeViewController`, called from `src/sync/apple.ts`):
  - `scanText`: the camera reads menus and signs (VisionKit) and you tap a line to translate it.
    Each line's language is detected (NaturalLanguage).
  - `translate`: Apple's Translation framework, on the phone.
  - `pickNearby` and `quickFile`: Apple's on-device model (Foundation Models) with typed answers.
- The **build number** is the count of commits on the branch (`scripts/set-ios-build.mjs`, and
  `vite.config.ts` for the web). Account & settings shows it, so you can tell what a phone has.

## 12. Notifications

There are three kinds:

1. **Local notifications**, scheduled on the phone (`sync/reminders.ts`). Example: "Do you have your
   passport?" 3 hours before each booked flight. No server involved.
2. **Push notifications** for things that start on someone else's phone:
   - when someone taps **Remind** on a to-do;
   - when someone **starts sharing where they are**.

   How it works:
   - The phone registers when you're signed in and saves its token (`save_push_token`).
   - `send-push` checks the caller is on the trip, works out who it's for, and sends a short, fixed
     message through Apple using an ES256 JWT made from the APNs key.
   - The same thing isn't sent twice within 10 minutes, and one person can send at most 20 an hour.
   - Signing out removes the phone's token.
3. **In-app banners** (`ui/remind.tsx`, `ShareNotice` in `ui/map.tsx`) say the same thing while the
   app is open, so a push isn't shown twice.

## 13. Editions: the app, the Japan edition, the website

- **The app** (`npm run build` → `dist/`): published to the phones and to `wrongtrain.lol/app/`.
- **The Japan edition** (`npm run build:japan` → `dist-japan/`, `VITE_EDITION=japan`,
  `src/edition.ts`):
  - It signs in with the Japan page's name and passcode, and reads the trip live from the Google
    Sheet through its Apps Script web app (`src/sheet/`).
  - Ticks and notes go back to the sheet, and the plan is changed in the sheet.
  - It has no Wallet, no Photos and no sharing, and it works offline (`public/japan-sw.js`).
  - The sheet's own scripts are in `legacy/apps-script/`.
  - **The Japan group now uses the TestFlight app**; this edition is the backup.
- **The website** (`site/`): plain HTML. Copy it over the root of `main` to publish.

## 14. Testing

| Command (in `app/`) | What it checks |
|---|---|
| `npm test` | Unit tests (Vitest), 160+ tests on the model: edits, merge, rules, money, fitting, planner, filing, reminders, quick filing, AI safety |
| `npm run e2e` | Builds, then drives every screen in headless Chromium (Playwright): editor, sharing, approvals, filing, nearby, wallet, planner, trip files, account, friends, Right now, photos, Add, and the Japan edition. Screenshots in `e2e/out/`. The server is mocked. Needs Python 3, and ports 8080–8110 free. |
| `npm run e2e:live` | Real Supabase: three throwaway anonymous users share, join and sync. Needs anonymous sign-ins switched on while it runs. |
| `sh supabase/test/run.sh <psql flags>` | The database's access rules (`rules.sql`), on a local Postgres |
| `npm run build` | Typecheck (`tsc -b`) and build |

## 15. Building and releasing

**Day to day:**

- Work happens on a branch off `app`. Adam and Andrea use `/start`, `/save`, `/catchup` and `/done`
  (`.claude/skills/`).
- `/done` runs the build and tests, then merges into `app`.
- Nobody commits straight to `app`.

| To publish | Do this |
|---|---|
| The browser copy | Build on `app`, then on `main` replace `app/` with `app/dist/` and push. GitHub Pages updates in a couple of minutes. |
| The Japan edition | Build with `npm run build:japan`, then on `main` replace `japan/` with `app/dist-japan/`. |
| Database | Run `schema.sql` in the Supabase SQL Editor (or through the Management API). It's safe to run again. |
| Server functions | `npx supabase functions deploy <name> --project-ref wklwpihkpiuniazhidjz --no-verify-jwt --use-api` |
| A phone, directly | `npm run build`, `node scripts/set-ios-build.mjs`, `npx cap sync ios`, then build in Xcode, or `xcodebuild` and `xcrun devicectl device install app --device <id> App.app` over Wi-Fi to paired devices with Developer Mode on |
| TestFlight | Archive (Release) and export with `destination: upload`. Then in App Store Connect add the build to the **Us** (internal) and **Friends** (external, beta review) groups with What to Test notes. |

**Logging and rolling back:**

- Every merge, publish and phone build gets a row in the sheet's Changelog.
- **Roll back** by reverting the commit, or go back to a tag such as `before-today-hub`. Old
  TestFlight builds stay installable for 90 days.

## 16. Security

**What's in place** (reviewed Oct 25, 2026):

- Row-level security on every table. Security-definer functions all set `search_path` and check
  `auth.uid()`. The counting and plan functions can only be run by the server.
- No secrets in the repo. The Supabase publishable key and the MapTiler key are public by design.
  The service-role key, the Anthropic key and the APNs key live only in Supabase.
- AI functions read the trip as the caller before using the service key, cap input sizes, and
  answer only in fixed JSON shapes. The planner claims its step before calling Claude.
- Invites:
  - only owners, organizers and editors make codes;
  - taking someone off a trip cancels their codes;
  - older codes can't bring them back.
- Trips over 5 MB aren't saved. Pushes have fixed wording and are rate-limited. Viewers can't
  Remind.
- Database error details go to `function_errors`, not to the app.
- Private IDs never leave the phone. Limited documents are hidden by the database and the storage
  rules.

**Known, accepted for now** (to fix after the Japan trip):

- **Contributors and viewers can edit other people's existing items in the "free" parts:** other
  people's expenses, marking debts settled, and Venmo handles. The fix is to require approval for
  changing items they didn't write. Both `rules.ts` and `change_needs_approval` need it.
- **Names aren't unique on a trip.** Since people are matched by name, someone could take a friend's
  name and get their reminders. The fix is to match by account.
- **Storage rules:** members can upload into another person's `limited/` folder, and people who
  leave can still delete files they uploaded.
- **Anyone on a trip can file someone else's note**, which then runs with the filer's level of say
  (partly by design; Undo is there).

## 17. Costs and limits

- **AI limits are switched off for testers** (Oct 25): `ai_limits_on()` in `schema.sql` returns
  false.

  | Limit | What it is |
  |---|---|
  | With limits on | 20 uses per trip; 6 a minute and 60 a day per person; 5 plans a month per person |
  | Safety net, always on | 300 AI uses and 20 plans a day per person |
  | Backstop | The Anthropic console's monthly spend limit caps the bill |

  **Before launch:** make `ai_limits_on()` return true, delete the `PLANNER_MODEL` secret (back to
  the best model), and hide test mode (`canTest` in `sync/planner.ts`).
- Uses and tokens are still counted. Adam and Andrea see "What the AI has cost" in Account &
  settings (`ai_costs`).
- **Overpass** (OpenStreetMap's public server) is free but slow and not meant for many users. Move
  to a paid places API or our own server before launch.
- **Supabase** and **GitHub Pages** are on their free or low tiers.

## 18. Running it: common jobs

- **Run the app locally:** `cd app && npm install && npm run dev`.
- **Change the database:** edit `schema.sql`, add a check to `supabase/test/rules.sql`, run the file
  in Supabase, and keep `rules.ts` in step if the rules changed.
- **Change a prompt:** edit `supabase/functions/_shared/*.ts`, run `npm test` (the shared code is
  unit-tested), and redeploy that function.
- **Turn the AI limits back on:** make `ai_limits_on()` return `select true` and run `schema.sql`.
- **See errors from the server:** look at `function_errors` in Supabase's Table Editor, and each
  function's logs in the dashboard.
- **Read testers' comments:** the `app_feedback` table.
- **Add a phrase language:** add a pack in `src/phrases/` with the same groups as the others, and
  register it in `index.ts`.
- **Rebuild the Japan trip file from the sheet:** `node legacy/to-app.mjs`. It holds booking
  numbers, so never put it in the repo.

## 19. Known gaps and next technical steps

**Performance and size:**

- Every page stays mounted and the app context is a new object on each render, so a change redraws
  every page. Memoize the context, and split the location and UI state out of it.
- The first download is heavy:
  - 494 kB of CSS, mostly a Japanese font iOS already has;
  - the map library and all ten phrase packs load up front.

  Load the map, the planner and the phrase packs only when needed.
- Some unused code is left from removed features: the Shopping tab, Transit leftovers, a dozen
  unused CSS classes and two unused font packages.

**Product and platform** (`CLAUDE.md` has the full list):

- Sign in with Apple and Google, and invites by person.
- Universal links, so invite links open the app.
- A share extension.
- Live transit and flight status.
- Push for Right now with the app closed.
- Paid passes (RevenueCat) and the freemium decision.

**Housekeeping:**

- The repo sits on an iCloud-synced Desktop, which keeps making "name 2" duplicate files (they broke
  git once). Moving the repo out of iCloud would stop that.
