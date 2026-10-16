# WrongTrain

Trip planner for groups, heading for iOS with Capacitor. Work in progress on the `app` branch;
`main` stays the live Japan 2026 page at wrongtrain.lol.

```
npm install
npm run dev     # local preview
npm run build   # typecheck and production build into dist/
```

## Layout

- `src/model/` – the trip data model (`types.ts`), date and time helpers, the sample trip,
  the "How much time do I have?" logic, search, and the on-phone store.
- `src/ui/` – the screens: Today, Days, Transit, Places, Map, Phrases, To do, and search.
- `src/phrases/` – phrase packs by language. Japanese ships with recorded clips in
  `public/phrases/ja.json`; phrases without a clip use the phone's own voice.

Trips are saved in localStorage on the phone. Group sync and the trip editor come next.
