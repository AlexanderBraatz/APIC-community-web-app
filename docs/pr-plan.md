# Pull Request Plan — Holiday Community App

**Companion to:** [`architecture-spec.md`](./architecture-spec.md)  
**Last updated:** 2026-08-03  
**Supabase project:** Hosted project linked to this GitHub repo  
**Agent tooling default:** **CLI migrations as source of truth** + **Supabase MCP for inspect/debug**

---

## 0. Goals of this plan

- Split the architecture into **small, independently testable PRs**.
- Keep each PR mergeable without requiring unfinished features to “pretend” to work.
- Prefer vertical slices where possible; isolate schema when that makes testing safer.
- Make agent work against Supabase **reviewable**: SQL lives in git; MCP does not become an invisible source of truth.

---

## 1. Tooling: Supabase CLI + MCP (chosen workflow)

### 1.1 Recommendation (short)

| Tool | Use for | Do not use as |
|------|---------|----------------|
| **Supabase CLI** | Creating/editing migrations under `supabase/migrations/`, linking the project, `db push` / CI apply, generating types | One-off dashboard schema that never hits git |
| **Supabase MCP** (Cursor) | Listing tables, reading schema, running **read** SQL, checking logs, validating a migration already in git, generating types in conversation | The only place schema exists; silent production writes without a migration file |
| **Supabase Dashboard** | Auth email templates, providers, API keys, occasional visual checks | Day-to-day table design for this app |
| **GitHub ↔ Supabase link** | Preview deploys / integration with the repo you already connected | Replacing migration files in the repo |

**Source of truth for schema:** `supabase/migrations/*.sql` in this repository.  
**MCP / dashboard:** apply or inspect only what is already expressed (or about to be committed) as a migration.

### 1.2 Why both (given your GitHub-linked cloud project)

- You already have a **hosted** project tied to GitHub. That is excellent for collaboration and deploy hooks.
- Agents are safest when they **edit files you can diff in a PR**, then apply those migrations with CLI (`supabase db push`) or an approved MCP `apply_migration` after you review the SQL.
- MCP alone is fast for debugging (“what columns exist?”, “did RLS reject this?”) but easy to drift from git if the agent applies ad‑hoc SQL.
- CLI alone is enough for schema, but slower for interactive “what’s on the remote right now?” questions during a coding session.

### 1.3 One-time setup (do before PR-01 lands)

1. Install CLI: [Supabase CLI](https://supabase.com/docs/guides/cli).
2. In the repo root:

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase init   # if no supabase/ folder yet
```

3. Add secrets to `.env.local` (never commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
```

4. Extend `.env.example` with the same keys (empty values).

5. Enable **Supabase MCP** in Cursor (project or user config), e.g. hosted:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

Or project-scoped URL from the dashboard **Connect → MCP** tab (restrict to this project if offered).

6. In Cursor: keep **manual approval** for MCP tool calls on. Prefer MCP for `list_*`, `execute_sql` (SELECT), logs; require a migration file before any schema-changing MCP call.

### 1.4 Agent rules for this repo (pin in PR-01 or a short AGENTS note)

When changing the database:

1. Write or update a file under `supabase/migrations/`.
2. Put the migration (and related app code) in the same PR when possible.
3. Apply with `supabase db push` (or reviewed MCP apply of that same SQL).
4. Do **not** invent tables only in the dashboard.
5. Prefer **database branches** (if enabled on the project) for risky experiments; otherwise use a staging project.

### 1.5 Local Docker vs cloud-only

| Mode | When |
|------|------|
| **Cloud-linked only** (fine for v1) | `supabase link` + `db push` against the hosted project (or a staging project). Simplest if you do not want Docker. |
| **Local + cloud** | `supabase start` for offline/dev; still commit migrations; push to linked project for shared env. |

This plan assumes **cloud-linked primary**. Local is optional.

---

## 2. Dependency graph

```text
PR-00 Tooling bootstrap
   │
   ▼
PR-01 Auth foundation (profiles, clients, sign-in, route gates)
   │
   ├──────────────┬──────────────────┐
   ▼              ▼                  ▼
PR-02        PR-03              PR-04
Invitations  Attendance         Account
             persistence        (profile/avatar)
   │              │                  │
   │              │                  │
   ▼              ▼                  │
PR-05 Listings read path ◄───────────┘ (can start after PR-01; needs auth decision O1)
   │
   ▼
PR-06 App admin: listings CRUD + geocode
   │
   ▼
PR-07 App admin: users + roles + delete
   │
   ▼
PR-08 App admin dashboard + audit UI
   │
   ▼
PR-09 Hardening & polish
   │
   ▼
PR-10 Things left to do
```

**Parallelism after PR-01:** PR-02, PR-03, and PR-04 can proceed in parallel on separate branches if needed. PR-05 can start after PR-01 (listings read does not require invitations). Prefer merging PR-02 before heavy admin work so real users exist.

**Tina `/admin`:** Never blocked by these PRs; leave alone until a rename PR in PR-09.

---

## 3. Pull requests

Each PR lists: purpose, scope, out of scope, migrations, test plan, merge criteria.

---

### PR-00 — Supabase tooling bootstrap

**Purpose:** Make the repo ready for agents and humans to manage the linked project safely.

**Includes**

- `supabase/config.toml` via `supabase init` (if missing).
- Document link/`db push`/MCP rules in this file (already) + short note in README or `docs/supabase.md`.
- `.env.example` placeholders for Supabase keys.
- Optional: `.cursor/mcp.json` with Supabase MCP URL (no secrets).
- Disable public sign-ups in Auth (dashboard) and note it in docs.

**Out of scope:** App feature code, tables beyond empty/config.

**Migrations:** None (or empty placeholder only if required by tooling).

**Independently testable**

- [ ] `supabase projects list` / link works for you.
- [ ] MCP can list the project / tables (even if empty).
- [ ] `.env.example` documents required vars.

**Merge when:** Tooling documented and linked; no feature dependency.

---

### PR-01 — Auth foundation

**Purpose:** Real sessions; profiles; gate members routes; replace “no auth” with a minimal sign-in path.

**Includes**

- Packages: `@supabase/supabase-js`, `@supabase/ssr` (or current Next 16 recommended helpers).
- Browser + server Supabase clients.
- Migration: `profiles` (`id`, `full_name`, `avatar_url`, `role`, timestamps).
- Trigger: on `auth.users` insert → create profile (`role = user`).
- RLS: members read public profile fields; update own name/avatar; no self role change.
- Pages: `/sign-in`, `/forgot-password`, `/reset-password` (invite accept can wait for PR-02).
- Middleware or layout guards for `/community-calendar`, `/place`, `/account` (account page can be stub).
- Header: sign-in / sign-out when session present.
- Seed first admin **manually** (SQL or dashboard): set one profile `role = admin` after first invite/user exists — document in PR.

**Out of scope**

- Invitation emails, attendance DB, listings Supabase, app admin UI.
- Removing scheduler mock login yet (still localStorage) — optional soft warning that mocks remain until PR-03.

**Independently testable**

- [ ] Create a user via dashboard “invite” or temporary enable of one-off user for smoke test.
- [ ] Sign in / out works.
- [ ] Unauthenticated visit to `/community-calendar` redirects to `/sign-in`.
- [ ] Authenticated visit loads existing DayPilot UI (still mock data).
- [ ] Profile row exists after Auth user creation.
- [ ] Member cannot update `role` via client.

**Merge when:** Gates + profiles + session work without depending on later PRs.

---

### PR-02 — Invitations + audit table + invite accept

**Purpose:** Invitation-only onboarding; start of admin audit trail.

**Depends on:** PR-01.

**Includes**

- Migrations: `user_invitations`, `admin_audit_log` (+ indexes from spec).
- Server actions / Edge Functions: `invite_user`, `resend_invitation`, `cancel_invitation` (service role).
- Disable remaining public sign-up paths; only invite creates users.
- UI: `/accept-invite` (set password).
- Minimal App Admin: `/members/admin/invitations` (form + pending list + resend/cancel) — enough to invite yourself/others without full dashboard.
- Audit writes for invite actions.
- Auth setting: invite email templates sanity-check in dashboard.

**Out of scope:** Full user management (promote/delete), full audit browser.

**Independently testable**

- [ ] Admin invites a new email → invite row `pending` + email arrives.
- [ ] Accept invite → user + profile `user` + invitation `accepted`.
- [ ] Duplicate pending invite / existing user rejected.
- [ ] Non-admin cannot call invite API.
- [ ] Audit rows created for invite/resend/cancel.
- [ ] Resend / cancel update invitation correctly.

**Merge when:** You can onboard a second human without the dashboard Auth UI as the primary path.

---

### PR-03 — Attendance persistence (scheduler on Supabase)

**Purpose:** Replace localStorage/mock DB with `attendance` + batch save; remove mock login.

**Depends on:** PR-01 (session user id + role). Better after PR-02 so multiple real profiles exist, but testable with two dashboard-created users.

**Includes**

- Migration: `attendance` table + RLS + check `start_date <= end_date`.
- RPC or server action `save_attendance_batch` (user merges own rows; admin full replace semantics per spec).
- DayPilot adapter: inclusive DB dates ↔ exclusive scheduler ends.
- Load stays for visible window / `end_date >= current_date`.
- Wire `scheduler.tsx` to Supabase; remove mock login, admin checkbox, seed localStorage paths.
- Keep draft → save / discard / soft-delete UX unchanged.
- Optional seed script mapping old seed stays → real profile ids (dev only).

**Out of scope:** App admin “edit anyone” screens beyond what the scheduler already allows for admins.

**Independently testable**

- [ ] Member A creates stay → Save → reload → stay persists; B sees it, cannot edit.
- [ ] Overlapping stays for same user allowed.
- [ ] Drag resize/move drafts then Save commits; Discard restores.
- [ ] Soft-delete × then Save removes row.
- [ ] Past stays outside default window not shown (or filtered per spec).
- [ ] Admin can edit another user’s bar and Save.
- [ ] RLS blocks forged `user_id` inserts as non-admin.

**Merge when:** Calendar is usable without localStorage for real auth users.

---

### PR-04 — Account page

**Purpose:** Profile self-service matching the existing brand chrome.

**Depends on:** PR-01. Can merge in parallel with PR-02/03.

**Includes**

- `/account`: full name, email (read-only), avatar upload (Storage + RLS), change password, sign out.
- Storage bucket policies for avatars.
- Scheduler row label uses `profiles.full_name` once PR-03 is in (coordination: if PR-04 merges first, PR-03 should read name from profiles).

**Out of scope:** Admin editing others’ profiles.

**Independently testable**

- [ ] Update name → reflected after refresh.
- [ ] Avatar upload visible to other authenticated users on calendar (once PR-03+ shows avatars if applicable).
- [ ] Password change works.
- [ ] Role not editable on account page.

**Merge when:** Account works with only PR-01 deployed.

---

### PR-05 — Listings read path (migrate JSON → Supabase)

**Purpose:** App reads listings from DB; search/map keep existing UX.

**Depends on:** PR-01. Apply O1 (gate vs public teaser) and O5 (category filter) as decided in this PR.

**Includes**

- Migrations: `listings`, `listing_tags`, `listing_tag_assignments` + constraints/categories enum.
- Seed/import from `content/data/listings.json` (script in repo).
- Switch `MockMap` / page data fetching to Supabase (server fetch or client with anon + RLS).
- Use `categoryFromPathname` so category pages filter correctly.
- Pins: only rows with lat/lng; document that most need geocoding in PR-06.
- Keep fuzzy helpers in `lib/listings-search.ts`.

**Out of scope:** Admin CRUD, geocoding UI, tag administration.

**Independently testable**

- [ ] Category page shows only that category’s listings.
- [ ] Tag chips + query filter behave as before.
- [ ] Map pins match filtered geocoded set.
- [ ] Unauthenticated behaviour matches O1 decision (redirect/CTA vs empty).
- [ ] JSON file no longer required at runtime (can remain as seed source).

**Merge when:** Browse/search works against DB without admin UI.

---

### PR-06 — App admin: listings CRUD + geocoding

**Purpose:** Admins manage places; coords via backend geocode + map confirm.

**Depends on:** PR-05 (schema + read path), PR-02 (admin role proven via invite path preferred).

**Includes**

- `/members/admin/listings` table + create/edit/delete.
- Creatable multi-select tags.
- Server `geocode_listing` + Find-on-map fallback using `LocationsMap`.
- Audit log entries for listing/tag mutations.
- Optional batch “geocode missing” for seed rows without coords.

**Out of scope:** Full audit UI browser (PR-08); user promote/delete.

**Independently testable**

- [ ] Admin creates listing with confirmed pin → appears on category map.
- [ ] Member cannot mutate listings (API + UI).
- [ ] Ambiguous address shows candidates; manual pin works.
- [ ] Delete removes assignments; confirmation required.
- [ ] Audit rows written.

**Merge when:** You can retire hand-editing JSON for new places.

---

### PR-07 — App admin: users, roles, delete

**Purpose:** Full user administration with final-admin safeguards.

**Depends on:** PR-02 (audit + invites), PR-01 (profiles).

**Includes**

- `/members/admin/users`: search, role filter, email visible.
- `change_user_role`, `delete_user` (service role) with final-admin + self-delete guards.
- Confirm dialogs (promote / demote / delete).
- Deletion policy per spec O2 (default: delete attendance; keep audit).
- Audit for role changes and deletes.

**Out of scope:** Dense analytics dashboard.

**Independently testable**

- [ ] Promote member → admin; demote back.
- [ ] Cannot demote/delete last admin.
- [ ] Delete user removes Auth user + attendance; invite history/audit retained as designed.
- [ ] Non-admin 403 on routes and APIs.

**Merge when:** Ops can manage membership without Supabase dashboard.

---

### PR-08 — App admin dashboard + audit log UI

**Purpose:** Operational overview and read-only audit browser.

**Depends on:** PR-02 (audit table), richer after PR-06/07 so actions exist.

**Includes**

- `/members/admin`: counts (users, admins, listings, pending invites), recent actions, links.
- `/members/admin/audit-log`: table, filters, detail drawer (old/new jsonb).

**Independently testable**

- [ ] Counts match DB.
- [ ] Filters return expected rows.
- [ ] Detail shows before/after for a known action.
- [ ] No client write path to audit table.

**Merge when:** Admins can investigate actions without SQL.

---

### PR-09 — Hardening & polish

**Purpose:** Production readiness and naming debt.

**Depends on:** Core feature PRs merged as needed.

**Includes (pick what still remains)**

- Indexes / `pg_trgm` if client-side search feels weak.
- Rate limits on invite/geocode.
- Fix `/add-attendance` and `/privacy` dead links.
- Rename Tina `mockMap` → `locationsMap` (content migration).
- Email template copy polish.
- Remove temporary smoke-test Auth toggles.
- Confirm Maps/Geocoding key restrictions.
- Types: `supabase gen types typescript` committed or CI-generated.
- Basic E2E smoke (Playwright optional): sign-in → calendar save → listing search.

**Independently testable:** Checklist per item; no greenfield schema.

---

### PR-10 — Things left to do

**Purpose:** Catch-all for leftover admin/listings work and production hardening that did not land in earlier PRs.

**Depends on:** Prior feature PRs as noted per item. Can follow PR-09 or be split into smaller follow-ups.

**Includes**

1. **Production Google key restrictions (reminder)** — Places Autocomplete / Place Details already run server-side via `GOOGLE_PLACES_API_KEY` (and Geocoding via `GOOGLE_GEOCODING_API_KEY`). Local/dev may use an **unrestricted** server key for convenience. Before production:
   - Restrict the Places (and Geocoding) server key(s) by **server egress IP** (hosting static IP / allowlist) — not HTTP referrers.
   - API restriction: Places API (New) (± Geocoding if shared).
   - Keep `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` referrer-restricted to Maps JavaScript API only; do not put Places on the browser key.
2. **Redesign the listings list UI** (admin `/members/admin/listings` table/list presentation).

**Done elsewhere (do not redo):** Admin Places name → address wizard + autofill (listing form / `lib/listings/places.ts`). Geocode-address fallback remains for manual recovery.

**Out of scope:** Member-facing MockMap browse redesign (unless needed for list consistency); full PR-09 hardening checklist items already covered there.

**Independently testable**

- [ ] Production Places/Geocoding server keys are IP-restricted; browser cannot usefully call those APIs with the restricted key.
- [ ] Production key allowlist / egress IP documented for the host (Vercel static IPs or equivalent).
- [ ] Redesigned listings list is clearer/usable on desktop and mobile for admins.

**Merge when:** Server Maps keys are locked down for production and any remaining list-UI work you want in this bucket is done.

**Branch idea:** `chore/leftovers` (or split: `chore/maps-key-lockdown`, `feat/admin-listings-list-ui`)

---

## 4. Suggested PR sizes & branching

| PR | Approx. size | Branch name idea |
|----|--------------|------------------|
| PR-00 | XS | `chore/supabase-tooling` |
| PR-01 | M | `feat/auth-foundation` |
| PR-02 | M–L | `feat/invitations` |
| PR-03 | L | `feat/attendance-supabase` |
| PR-04 | S–M | `feat/account` |
| PR-05 | M | `feat/listings-read` |
| PR-06 | L | `feat/admin-listings` |
| PR-07 | M–L | `feat/admin-users` |
| PR-08 | M | `feat/admin-audit-ui` |
| PR-09 | S–M | `chore/hardening` |
| PR-10 | S–M | `chore/leftovers` |

Avoid combining PR-03 + PR-06 in one PR: scheduler and listings are separately testable and both touch large UI files.

---

## 5. Cross-cutting test matrix (quick smoke after each merge)

Run after every feature PR:

1. Marketing home still renders (Tina unaffected).
2. Tina `/admin` still loads.
3. Maps key still shows map on a category page (or expected gated empty state).
4. Sign-in → members hub → calendar route reachable as designed for that PR’s gate state.
5. No `SUPABASE_SERVICE_ROLE_KEY` in client bundles (`next build` + sanity grep).

---

## 6. Default answers to open decisions (lock in PR that first needs them)

| ID | Default for this PR plan | Lock in |
|----|--------------------------|---------|
| O1 | Full listings require auth; public category pages show CTA to sign in | PR-05 |
| O2 | Delete all attendance on user delete; keep audit with user id | PR-07 |
| O3 | Prefer **Next.js Server Actions** for admin ops; use Edge Functions only if invite email/deploy needs them | PR-02 |
| O4 | Rename `mockMap` in PR-09 (not blocking) | PR-09 |
| O5 | Category pages filter by slug | PR-05 |

Override in the PR description if product chooses otherwise.

---

## 7. What the agent should do on a typical feature PR

Example: starting **PR-03**

1. Read `docs/architecture-spec.md` §8 and this PR’s section.
2. Add migration SQL under `supabase/migrations/`.
3. Use MCP `list_tables` / read-only SQL to confirm remote state before/after.
4. Implement `save_attendance_batch` + wire scheduler.
5. Ask you (or use CLI) to `supabase db push` after you approve the migration diff.
6. Leave mock-removal and RLS tests in the PR test plan checked off in the description.

---

## 8. Ready to start

**Immediate next step:** open **PR-00**, then **PR-01**.

PR-00 tooling notes live in [`supabase.md`](./supabase.md).

Before coding PR-01, ensure:

- [ ] Project linked (`supabase link`)
- [ ] Env vars in `.env.local`
- [ ] Public sign-up disabled
- [ ] Supabase MCP connected in Cursor with tool-call approval on
- [ ] Agreement on O3 (Server Actions vs Edge) — plan default: Server Actions
