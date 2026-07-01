# Setting up your own Supabase (cloud sync + login)

Cloud sync is **optional**. Without it, William runs entirely on `localStorage` in
one browser. Set it up when you want your data to sync across devices and be
recoverable after clearing the browser.

Your app needs very little from Supabase: **one table** and **email login**.

---

## 1. Create a project
1. Go to <https://supabase.com> → sign in → **New project** (free tier is fine).
2. Pick a name + a database password (save it), choose a region near you.
3. Wait ~2 min for it to provision.

## 2. Get your keys into the app
1. In the project: **Project Settings → API**.
2. Copy the **Project URL** and the **`anon` `public`** key.
3. In the repo root, copy `.env.example` → `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
   ```
   `.env.local` is git-ignored, so your keys never get committed.
4. Restart `npm run dev` (Vite only reads env vars at startup).

> The `anon` key is safe to expose in a frontend — it only allows what your
> Row Level Security policies (below) permit.

## 3. Create the sync table
Open **SQL Editor** in Supabase, paste this, and click **Run**:

```sql
-- One row per user per store; the app upserts JSON blobs here.
create table public.sync_stores (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  store_key  text        not null,
  payload    jsonb       not null,
  checksum   text        not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

-- Row Level Security: users can only touch their own rows.
alter table public.sync_stores enable row level security;

create policy "own rows - select" on public.sync_stores
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.sync_stores
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.sync_stores
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on public.sync_stores
  for delete using (auth.uid() = user_id);
```

## 4. Turn on Realtime (live multi-device updates)
**Database → Replication** (or **Realtime**) → enable replication for the
`public.sync_stores` table. The app subscribes to this so a change on your
laptop appears on your phone without a refresh.

## 5. Email login
The app signs in with a **6-digit email code** (`signInWithOtp`). By default
Supabase sends this email for you — nothing else to configure:
- **Authentication → Providers → Email**: make sure **Email** is enabled and
  **"Confirm email"** / OTP is on.
- (Supabase's free built-in email is rate-limited to a few per hour — fine for
  personal use.)

That's the whole setup. Sign in from **Account → Sync** (or Setup step 8).

---

## Optional: branded sign-in emails (`supabase/functions/send-auth-email`)
The repo includes a Deno edge function that sends a nicer OTP email via
[Resend](https://resend.com) instead of Supabase's default. **You do not need
this to sync** — skip it unless you want custom-branded emails. To use it:
1. `npm i -g supabase` then `supabase login`.
2. `supabase functions deploy send-auth-email --project-ref YOUR-PROJECT-REF`.
3. Add a `RESEND_API_KEY` secret and set a verified `FROM_EMAIL` in the function.
4. **Authentication → Emails → Auth Hooks**: point the "Send Email" hook at the
   function.
