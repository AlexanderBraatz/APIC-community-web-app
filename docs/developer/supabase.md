# Supabase tooling

Companion: [`architecture-spec.md`](./architecture-spec.md), [`pr-plan.md`](./pr-plan.md).

## Project

- Hosted API URL: `https://umvlotfvnnpttaddjwna.supabase.co`
- Project ref: `umvlotfvnnpttaddjwna`
- GitHub repo is linked to this Supabase project in the dashboard.

## Source of truth

| Concern | Source of truth |
|---------|-----------------|
| Schema / RLS / DB functions | `supabase/migrations/*.sql` in git |
| Live inspect / debug | Supabase MCP in Cursor (`user-supabase`) |
| Secrets | `.env.local` (gitignored) — never commit |

Do **not** create tables only in the dashboard. Prefer a migration file, then apply it.

## CLI (required for humans + agents writing migrations)

Dev dependency: `supabase` (use via `npx supabase`).

```bash
# One-time (browser login)
npx supabase login

# Link this repo to the hosted project (prompts for DB password)
npx supabase link --project-ref umvlotfvnnpttaddjwna

# After adding/changing files under supabase/migrations/
npx supabase db push
```

Optional npm scripts:

```bash
npm run supabase:login
npm run supabase:link
npm run supabase:db:push
```

Local Docker stack (`supabase start`) is **optional**. Cloud-linked `db push` is enough for v1.

## Env vars

Copy from `.env.example` into `.env.local`:

| Variable | Where used |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (RLS-bound). Legacy JWT `anon` key or newer `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — invites, admin deletes, etc. **Never** `NEXT_PUBLIC_` |

Dashboard: **Project Settings → API** for URL and keys.  
Service role: **Project Settings → API → service_role** (keep secret).

## MCP (Cursor)

Official Supabase MCP should appear as `user-supabase` (ready). Useful tools: `list_tables`, `execute_sql` (prefer SELECT while debugging), `list_migrations`, `apply_migration`, `get_logs`, `get_advisors`, `get_publishable_keys`.

**Rules for agents**

1. Write schema changes as `supabase/migrations/*.sql` first.
2. Keep Cursor **manual approval** on for MCP tool calls.
3. Prefer CLI `db push` or a reviewed `apply_migration` of that same SQL — not ad-hoc DDL.
4. Never put service role keys in MCP config or committed files.

Example Cursor config (no secrets) — see `.cursor/mcp.json` if present:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

You can also use the project-scoped MCP URL from the dashboard **Connect → MCP** tab.

## Auth settings (dashboard)

Already expected for this app:

- [x] **Public sign-ups disabled** (invitation-only; see PR-02 for invite flow).
- Confirm under **Authentication → Providers → Email** (disable “Enable sign ups” / equivalent).
- **URL configuration:** set Site URL to your app origin (local: `http://localhost:3000`; production: your Vercel HTTPS URL).
- Add matching Redirect URLs for local and production, including `/auth/confirm` (and `/accept-invite` if listed).
- Set `NEXT_PUBLIC_SITE_URL` to that origin (`.env.local` locally; Vercel env in production) so invite and password-reset emails build the correct `redirectTo`.
- [ ] **Leaked password protection** — Authentication → Attack Protection (HaveIBeenPwned); enable when ready for production.
- [ ] **Invite / recovery email copy** — Authentication → Email Templates; keep APIC tone and links to `/auth/confirm` + `/accept-invite` / `/reset-password`.

TinaCMS `/admin` is unrelated to Supabase Auth.

## Maps / Places / Geocoding keys

| Key | Where | Restriction |
|-----|-------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser (Maps JS) | HTTP referrer allowlist (localhost + production domain); API = Maps JavaScript API |
| `GOOGLE_PLACES_API_KEY` | Server only (Places Autocomplete + Place Details) | Prefer a **separate** key restricted by server IP; API = Places API (New) |
| `GOOGLE_GEOCODING_API_KEY` | Server only (geocode actions) | Prefer a **separate** key restricted by server IP; fall back to Maps key in code is for local only |

Enable **Places API (New)** and **Maps JavaScript API** (keep **Geocoding API** if you use the geocode fallback). Places lookup resolves `GOOGLE_PLACES_API_KEY` → `GOOGLE_GEOCODING_API_KEY` → Maps key for local only.

**Reminder (PR-10 — Things left to do):** local/dev may use an unrestricted Places server key. Before production, IP-restrict Places/Geocoding server keys to host egress; keep Places off the browser Maps key. Until then keep Places/Geocoding off browser keys you share publicly.

## TypeScript DB types

Committed at `lib/supabase/database.types.ts`. Refresh after schema changes:

```bash
npm run supabase:types
```

Wire clients with `createClient<Database>` (browser, server, service role).

## Admin rate limits (app process)

Process-local sliding windows in `lib/admin/rate-limit.ts` (single Node instance):

- Invite / resend: 20 / admin / hour
- Geocode (single): 30 / admin / minute
- Geocode missing batch: 5 / admin / hour
- Places autocomplete / details: 60 / admin / minute

Scale-out needs a shared store (e.g. Redis); not required for v1.

## Advisor notes (intentional)

Security Advisor may warn that `write_admin_audit` and `change_user_role` are `SECURITY DEFINER` callable by `authenticated`. Both call `is_admin()` internally; revoke-only would break the admin RPC path. Leave as-is unless moving those writes fully to the service-role client.

## First admin (PR-01)

After you create the first Auth user (Dashboard → Authentication → Users → Add user / Invite):

1. Confirm a `profiles` row exists (`role = user` by default).
2. Promote that user in SQL Editor or via MCP `execute_sql`:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

Only do this for the bootstrap admin. Later PRs add invite + role-change APIs with final-admin protection.

## Smoke checks (PR-00)

- [x] `npx supabase projects list` works after login.
- [x] `npx supabase link --project-ref umvlotfvnnpttaddjwna` succeeds.
- [x] MCP `list_tables` on `public` works (may be empty until PR-01).
- [x] `.env.example` lists the Supabase variables above.

## Smoke checks (PR-01)

- [ ] Migration `create_profiles` applied (`profiles` table visible).
- [ ] Create a user in the Auth dashboard → `profiles` row appears.
- [ ] `/community-calendar` redirects to `/sign-in` when signed out.
- [ ] Sign in works; signed-in calendar loads (attendance from DB after PR-03).
- [ ] `/account` shows email + profile; sign out works.
- [ ] Member cannot change `role` via the Data API (column not granted for update).

## Smoke checks (PR-03)

- [ ] Migration `create_attendance` applied; `save_attendance_batch` exists.
- [ ] Signed-in calendar shows **profiles as rows** (no mock login select).
- [ ] Create/edit stay → Save → reload persists; other user can see but not edit.
- [ ] Soft-delete × then Save removes the row.
- [ ] Discard restores draft to last saved snapshot.
- [ ] Modal end date is inclusive (same calendar day as “last day present”).
- [ ] Admin (`profiles.role = admin`) can edit others’ stays and Save.

## Smoke checks (PR-02)

- [ ] Migration `create_invitations_and_audit` applied.
- [ ] Admin opens `/members/admin/invitations`, invites a new email, row is `pending`.
- [ ] Invite email arrives; link lands on `/accept-invite` after `/auth/confirm`.
- [ ] Invitee sets password → profile exists (`role = user`) → invitation `accepted`.
- [ ] Resend / cancel work; audit rows appear in `admin_audit_log`.
- [ ] Non-admin visiting `/members/admin/invitations` redirects to `/place`.

## Smoke checks (PR-04)

- [ ] Migration `create_avatars_storage` applied (`avatars` bucket exists).
- [ ] `/account` shows email (read-only), role (read-only), editable name.
- [ ] Save name → refresh shows new `profiles.full_name` (calendar row label updates).
- [ ] Avatar upload writes under `{user_id}/` and updates `profiles.avatar_url`.
- [ ] Password change on `/account` succeeds; sign-in with new password works.
- [ ] Role is not editable on the account page (column not granted for update).

## Smoke checks (PR-05)

- [ ] Migration `create_listings` applied (`listings`, `listing_tags`, `listing_tag_assignments`).
- [ ] `npm run seed:listings` imports ~75 rows from `content/data/listings.json`.
- [ ] Signed-out category page (`/food-dining` etc.) shows CTA, not listing data.
- [ ] Signed-in category page shows only that category’s listings (O5).
- [ ] Keyword chips + query filter behave as before.
- [ ] Map pins only for rows with lat/lng (most wait for PR-06 geocoding).
- [ ] JSON file is seed-only — not imported at runtime by `lib/listings-search.ts`.

## Smoke checks (PR-06)

- [ ] Migration `admin_listings_mutate` applied (admins can insert/update/delete listings).
- [ ] Admin opens `/members/admin/listings`, creates a listing with confirmed pin.
- [ ] Listing appears on the matching category page for signed-in members.
- [ ] Ambiguous geocode shows candidates; manual “Find on map” pin works.
- [ ] Delete asks for confirmation and removes the row + keyword assignments.
- [ ] `admin_audit_log` records listing create/update/delete (and auto-geocode).
- [ ] Non-admin cannot mutate listings (UI redirects; Data API policies block).

## Smoke checks (PR-07)

- [ ] Migration `admin_users_role_and_delete` applied (`change_user_role` exists).
- [ ] `/members/admin/users` lists members with emails; search + role filter work.
- [ ] Promote member → admin; demote back (confirm dialogs).
- [ ] Cannot demote or delete the last remaining admin.
- [ ] Self promote/demote/delete controls are disabled / blocked.
- [ ] Delete removes Auth user + attendance; invitation history reassigned; audit retained.
- [ ] Non-admin visiting `/members/admin/users` redirects to `/place`.

## Smoke checks (PR-08)

- [ ] `/members/admin` shows counts for users, admins, listings, pending invites (match DB).
- [ ] Dashboard recent actions list known invite / role / listing events.
- [ ] `/members/admin/audit-log` filters by action, target type, and summary search.
- [ ] Detail dialog shows before/after JSON for a known promote or listing update.
- [ ] Non-admin cannot insert/update/delete `admin_audit_log` (select-only RLS; no client write UI).
- [ ] Non-admin visiting `/members/admin` or `/members/admin/audit-log` redirects to `/place`.

## Smoke checks (PR-09)

- [ ] Migration `listings_trigram_indexes` applied (`pg_trgm` + GIN indexes on listing name/type and keyword name).
- [ ] `/place` Attendance Calendar button works; **Add Attendance** button removed (no `/add-attendance`).
- [ ] Footer Privacy Policy → `/privacy` loads stub policy page.
- [ ] Category pages still show listings browse + map (`locationsMap` Tina block / `ListingsBrowse`).
- [ ] Invite/resend and geocode actions return a friendly error when rate-limited.
- [ ] `lib/supabase/database.types.ts` exists; `npm run supabase:types` regenerates it.
- [ ] Dashboard: leaked-password protection + email template polish (manual).
- [ ] Dashboard / Cloud Console: Maps JS key referrer-restricted; Geocoding/Places server keys IP-locked for production (PR-10 — Things left to do). Local may stay unrestricted for now.

### Auth redirects for invites

Dashboard → **Authentication → URL configuration**

- **Production Site URL:** `https://YOUR-PROJECT.vercel.app` (or custom domain)
- Redirect URLs **must** allow the app’s `redirectTo` targets (wildcards recommended):
  - `http://localhost:3000/**`
  - `https://YOUR-PROJECT.vercel.app/**`

If `/auth/confirm` is not allowed, Supabase falls back to Site URL (`/`) with tokens in the **URL hash**. `HashSessionRecovery` in the root layout recovers those sessions and routes invite → `/accept-invite`, recovery → `/reset-password`. Prefer fixing Redirect URLs so links land on `/auth/confirm` directly.
