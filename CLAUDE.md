# WrongTrain

A group trip planner, heading for the iOS App Store. It began as the Japan 2026 page at
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
- Shared trips sync through Supabase: `supabase/schema.sql` (already run on the project),
  `src/sync/engine.ts`, three-way merge in `src/model/merge.ts`.
- Supabase project: `https://wklwpihkpiuniazhidjz.supabase.co`. The publishable key in
  `src/sync/config.ts` is public by design. Never put the secret/service_role key anywhere.
- Sign-in is an emailed 6-digit code. Email goes through Gmail SMTP (adam@thefreemans.io for
  now; wrongtrain.lol is being added to Google Workspace). The email templates contain only
  the code, no link.

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
offline queue), email sign-in, iOS project with icon and launch screen.

Next:
1. **First build on the Mac.** Xcode is installed. Follow `app/IOS.md`: Node.js, clone,
   `npm install`, `npm run ios`, sign with the personal team, run on the iPhone. Nothing has
   been built for iOS yet, so expect first-build fixes.
2. **Map tiles.** The map uses OpenStreetMap's tile server, which does not allow app use and
   may block requests from the iOS web view. Switch to MapTiler (waiting on an API key); the
   tile URL is in `src/ui/map.tsx` and `src/ui/form.tsx`.
3. **Apple Developer account**: enrollment pending. Then App Store Connect, TestFlight.
4. **Untested by a person yet**: sharing between two real devices (the live test covers it
   with throwaway users).
5. Later: Sign in with Apple (needs the developer account), universal links so invite links
   open the app, a city list for guessing time zones (Kyoto, Florence and similar don't match
   an IANA zone name), editing the "Before you go" guides.

## Conventions

- Plain, specific wording in the UI and in comments; comments explain why.
- Commit as Adam (adam@thefreemans.io).
