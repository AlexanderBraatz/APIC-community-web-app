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
- **URL configuration:** set Site URL to your app origin (local: `http://localhost:3000`).
- Add the same origin under Redirect URLs, plus `http://localhost:3000/auth/confirm`.
- Set `NEXT_PUBLIC_SITE_URL` in `.env.local` to that origin so password-reset emails build the correct link.

TinaCMS `/admin` is unrelated to Supabase Auth.

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
- [ ] Sign in works; signed-in calendar still shows mock DayPilot data.
- [ ] `/account` shows email + profile; sign out works.
- [ ] Member cannot change `role` via the Data API (column not granted for update).
