# WrongTrain

Trip planner for groups, heading for iOS with Capacitor. Work in progress on the `app` branch;
`main` stays the live Japan 2026 page at wrongtrain.lol.

```
npm install
npm run dev     # local preview
npm run build   # typecheck and production build into dist/
npm test        # unit tests for the trip model and editing
npm run e2e     # build, then drive every screen and the editor in headless Chromium
```

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

Trips are saved in localStorage on the phone. Group sync comes next.
