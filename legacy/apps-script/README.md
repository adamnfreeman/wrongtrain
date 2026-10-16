# The Japan sheet's script

The Apps Script behind the Japan 2026 Google Sheet (Extensions → Apps Script in the sheet), kept
here so changes to it can be reviewed. The copy that runs lives in the sheet; after changing it,
deploy a new version (Deploy → Manage deployments → edit → Version: New version → Deploy). The
web app's link stays the same, so the Japan page and the app need no change.

- `Code.gs`: sign-in (Accounts tab), reading the sheet, ticks, and saving group notes.
- `Filer.gs`: files each group note into the sheet within about a minute, through Claude.
  Needs `ANTHROPIC_API_KEY` in Project Settings → Script Properties, and `setUpFiling()` run once.
