# Edge Functions

## file-note: Claude files group notes

When someone adds a group note on a shared trip, the app sends it to `file-note`. The function
checks the person is signed in and on the trip, counts the use against the trip's allowance,
and asks Claude (`claude-opus-5-5`, structured outputs) how to file it: a place, a to-do, a plan
item, or nothing, with the note left open for the owner. The app then makes those changes
through its normal edit path, so the trip rule decides what goes straight in and what becomes a
request (`src/model/filing.ts`, `src/sync/filing.ts`).

- `file-note/index.ts` – the function (Deno).
- `_shared/filing.ts` – the prompt, the answer's JSON schema, and the cut-down trip Claude sees.
  Plain TypeScript, also used by the app and the unit tests.

The Anthropic API key is a Supabase secret, `ANTHROPIC_API_KEY`. It is never in the app or in
this repository.

**Usage.** Each trip gets 20 free filings, counted in the `ai_uses` table (`claim_ai_use` in
`schema.sql`; a failed call is given back). A row in `trip_passes` raises it to 500; nothing
writes that table yet, it is there for the paid per-trip pass. To change the numbers, edit
`ai_allowance` in `schema.sql`. To see how much a trip has used, run this in the SQL Editor:

```sql
select trip_id, count(*), sum(input_tokens) as input, sum(output_tokens) as output from ai_uses group by trip_id;
```

Places are filed without map coordinates: Claude's guesses are not reliable enough. They show in
the lists and open a maps search; pins can come once MapTiler geocoding is in.

## Setting it up

Do these once, in this order. The app works without them: notes just stay as notes, and
"File with Claude" says it is not set up yet.

### 1. Update the database

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click the **WrongTrain** project.
3. In the left sidebar, click **SQL Editor**.
4. Click **+ New query**.
5. Open `app/supabase/schema.sql` on the Mac, select everything (⌘A), copy it (⌘C).
6. Click in the query box in Supabase, paste (⌘V).
7. Click **Run** (bottom right). It should finish with "Success. No rows returned".

This also adds the approvals tables if they are not there yet. It is safe to run again.

### 2. Get an Anthropic API key

1. Open [console.anthropic.com](https://console.anthropic.com) and sign in.
2. If asked, add a payment method under **Settings → Billing**. Filing one note costs a fraction
   of a cent to a few cents.
3. Optional but wise: under **Settings → Limits**, set a monthly spend limit, e.g. $20.
4. Click **Settings → API keys**, then **Create key**.
5. Name it `wrongtrain-file-note` and click **Create key**.
6. Click **Copy**. Keep the window open until step 3 is done: the key is only shown once.

### 3. Store the key in Supabase

1. Back in the Supabase dashboard, with the WrongTrain project open, click **Edge Functions** in
   the left sidebar.
2. Click **Secrets**.
3. Under **Add new secret**, type `ANTHROPIC_API_KEY` as the **Name**.
4. Paste the key into **Value**.
5. Click **Save**.

Do not paste the key anywhere else: not in the app, not in a file in this folder, not in chat.

### 4. Deploy the function

This uses the Supabase command-line tool through `npx`, so nothing needs installing first.

1. Open **Terminal**.
2. Go to the app folder:

   ```bash
   cd ~/Desktop/wrongtrain/app
   ```

3. Sign the tool in to Supabase. A browser window opens; click **Authorize**, then come back to
   Terminal:

   ```bash
   npx supabase login
   ```

4. Deploy (`--no-verify-jwt` because the function checks the sign-in itself, which works with
   Supabase's newer key types too):

   ```bash
   npx supabase functions deploy file-note --project-ref wklwpihkpiuniazhidjz --no-verify-jwt --use-api
   ```

   It should end with "Deployed Functions on project wklwpihkpiuniazhidjz: file-note".
5. In the dashboard, click **Edge Functions**: `file-note` is now listed.

Run step 4.4 again whenever `file-note/index.ts` or `_shared/filing.ts` changes.

### 5. Try it

1. On a phone or at wrongtrain.lol/app/, open a shared trip while signed in.
2. Go to the **To do** tab.
3. Under **Group notes**, type something like "Add Time Out Market for lunch" and tap
   **Add note**.
4. Within a few seconds the note shows "Claude is filing this…", then what was filed, with
   **Undo** and **OK**. The place appears on the Places tab under Ideas.

If it says something went wrong, open **Edge Functions → file-note → Logs** in the dashboard to
see why. "Filing notes is not set up yet" means the secret from step 3 is missing.
