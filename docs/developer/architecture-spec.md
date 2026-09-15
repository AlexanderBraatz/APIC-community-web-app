# Holiday Community App — Improved Architecture & Permissions Spec

**Status:** Implementation-ready reference  
**Last updated:** 2026-08-03  
**Basis:** Supabase/permissions plan (backend source of truth) + current APIC Community repo UI/routes (frontend source of truth)

---

## 0. How to use this document

This is the master specification. Later work should be carved into vertical slices (suggested build phases live in §22).

**Authority rules when the earlier ChatGPT plan and this repo disagree:**

| Area                                                                                                       | Source of truth                                                                              |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Roles, invitations, RLS, audit log, secure backend functions, final-admin protection                       | Supabase plan (refined here)                                                                 |
| Attendance / “availability” **interaction model** (DayPilot scheduler, draft/save, modals, permissions UX) | Existing UI in `app/components/scheduler.tsx` + `availability-modal.tsx`                     |
| Location browsing / search / map presentation                                                              | Existing UI in `components/ui/mock-map.tsx` + `locations-map.tsx` + `lib/listings-search.ts` |
| Public marketing site, CMS blocks, brand chrome                                                            | Existing Tina + layout patterns                                                              |
| Data ownership for live member data                                                                        | Supabase (new)                                                                               |
| Data ownership for marketing pages                                                                         | TinaCMS (existing)                                                                           |

---

## 1. Product purpose (refined for this repo)

This is a private platform for members of a holiday community (Castelfalfi / APIC).

It is **not** a property booking or rental-availability product. Domain language in the product should prefer:

- **Attendance** / **stays** / **who is here**
- UI route already used: `/community-calendar` (“Attendance Calendar”)

### Standard members can

- Sign in after invitation (no public self-registration).
- View current and future attendance of other members on the community calendar.
- Manage their own attendance stays (create / edit / delete within the existing scheduler UX).
- Browse useful local **listings** (places), search/filter them, and view them on Google Maps.
- Manage their own profile (name, avatar) and password.

### Admins can

- Do everything members can.
- Invite users; view pending and historical invitations; resend / cancel.
- Manage users and roles; delete users (with final-admin safeguards).
- Manage any member’s attendance.
- Create / edit / delete listings (and tags).
- View an administrative audit log.

### Out of scope for v1 (explicit)

- Public registration.
- Messaging / chat (icons and marketing copy may exist; no product backend required yet).
- Booking units, payments, or inventory.
- Replacing TinaCMS for marketing page editing.
- Full historical attendance archive UI for members (see §8.5).

---

## 2. Current repo baseline (what already exists)

| Layer         | Today                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router, React 19, Tailwind 4, shadcn                                   |
| CMS           | TinaCMS — pages only; `/admin` rewrite → Tina static admin                            |
| Attendance UI | DayPilot Scheduler at `/community-calendar` — full mock auth, draft/save, soft-delete |
| Listings UI   | Tag/fuzzy search + Google Maps via `@vis.gl/react-google-maps` on category pages      |
| Listings data | `content/data/listings.json` (~75 rows); only a few have `lat`/`lng`                  |
| Auth          | None (scheduler “Log in as” + “Admin role” are test controls)                         |
| Supabase      | Not installed                                                                         |
| Members hub   | `/place` (public Tina page) linking to calendar + dead `/add-attendance`              |

**Implication:** Backend auth, profiles, persisted attendance, member admin console, invitations, and listing CRUD are net-new. The scheduler and locations explorer UIs should be **evolved**, not redesigned from the ChatGPT UI inventory.

---

## 3. Roles

Two application roles only:

- `user` (member)
- `admin`

Stored on `profiles.role`. Never trust client-provided role for authorization.

### Member (`user`) may

| Action                                                | Notes                         |
| ----------------------------------------------------- | ----------------------------- |
| Sign in / reset / change own password                 | Supabase Auth                 |
| Read profiles (id, full_name, avatar_url)             | No other emails               |
| Read attendance bars in the scheduler window          | See §8                        |
| Create / edit / soft-delete / save **own** attendance | Existing draft→save semantics |
| Read listings; search; map pins                       | Authenticated (see §5 gating) |
| Update own `full_name`, `avatar_url`                  | Not `role`                    |

### Member may **not**

- Invite, view invitations, manage roles, delete users
- Read other users’ emails
- Mutate listings / tags
- Mutate another member’s attendance
- Access app admin routes or audit log
- Access TinaCMS unless separately provisioned (CMS access is orthogonal)

### Admin may

- All member actions
- Invite / resend / cancel invitations
- View all users including emails
- Promote / demote (except final-admin cases)
- Delete users (except final-admin / self without handoff)
- Create / update / delete any attendance record
- Create / update / delete listings and tags
- Read audit log

### Final-admin protection (required)

The system must prevent:

1. Demoting the last remaining admin.
2. Deleting the last remaining admin.
3. An admin deleting their own account without another admin remaining.

Enforce in secure backend functions (not only UI).

---

## 4. Dual “admin” surfaces (naming decision)

| Surface       | Path                               | Purpose                                  |
| ------------- | ---------------------------------- | ---------------------------------------- |
| **CMS Admin** | `/admin` (existing rewrite → Tina) | Edit marketing markdown / blocks         |
| **App Admin** | `/members/admin/*` (new)           | Users, invitations, listings CRUD, audit |

Do **not** put member-management UI under `/admin` — that path already means Tina.

Optional later rename of Tina to `/cms` is allowed but not required for v1.

Header “Member Dashboard” → `/place` today. After auth ships, `/place` (or `/members`) becomes the gated hub; keep calendar entry from there.

---

## 5. Access model for the site

### Public (no auth)

- Marketing pages: `/`, `/about`, `/events`, category pages, Tina content.
- Sign-in / invite-accept / password-reset routes.

### Authenticated members (and admins)

- `/community-calendar` (attendance)
- `/account`
- Listing **data** and map may remain visible on public category pages for marketing, **or** be gated — **decision for product:**

**Recommended v1:** Keep category **pages** public for marketing, but treat **full listings JSON + map pins** as member-visible once auth exists (same components, fetch from Supabase only when session present; public SSR can show empty/CTA). If marketing needs map teasers without auth, expose a curated subset only.

Document the chosen option when implementing §22 Phase 4.

### App admins only

- `/members/admin` and nested routes.

### Tina CMS

- Separate from app roles. Staff who edit content need Tina credentials (existing self-hosted/local pattern). Do not conflate `profiles.role = admin` with Tina login unless you deliberately unify later.

---

## 6. Authentication & invitations

### Rules (backend plan retained)

- Public sign-up disabled in Supabase Auth.
- Invite-only onboarding via secure backend (Edge Function or Next.js server route using **service role** — never in the browser).
- Service role key only on server / Edge Function.

### Onboarding flow

1. App admin submits email in App Admin UI.
2. Backend verifies requester is admin (`profiles.role`).
3. Reject if email already belongs to an auth user or has a `pending` invitation.
4. Create/send Supabase invite; write `user_invitations` row; write `admin_audit_log`.
5. Invitee opens link → sets password → Auth user created.
6. Trigger/function creates `profiles` row with `role = user`, `full_name` from email local-part or prompt.
7. Invitation marked `accepted`; `auth_user_id` set; audit logged.

### Sign-in

- Email + password.
- Post-login redirect: `/place` (members hub) or deep link (e.g. `/community-calendar`).

### Password

- Forgot-password email flow (Supabase).
- Signed-in change password.
- Admins never view or set another user’s password.

### Scheduler mock login removal

When real auth lands, remove:

- “Log in as” select
- “Admin role” checkbox
- localStorage mock DB keys

Replace with session-derived `userId` + `role` from `profiles`.

---

## 7. Data architecture overview

```
┌─────────────────────┐     ┌──────────────────────────────┐
│ TinaCMS             │     │ Supabase                     │
│ content/pages/*.md  │     │ auth.users                   │
│ marketing UI only   │     │ profiles                     │
└─────────────────────┘     │ attendance (stays)           │
                            │ listings + listing_tags      │
                            │ user_invitations             │
                            │ admin_audit_log              │
                            └──────────────────────────────┘
         ▲                                ▲
         │                                │
   Public Next pages              Authed App Router
   (existing PageContent)         + Server Actions / Edge Fns
```

**Listings migration:** Start with import of `content/data/listings.json` into Supabase. Stop treating JSON as the live source after cutover. Keep a one-time seed script.

**Events** on `/events` remain Tina content for v1 (not the attendance calendar).

---

## 8. Attendance (availability) — UI truth + DB contract

### 8.1 What the UI is

Existing: **DayPilot Scheduler** (`@daypilot/daypilot-lite-react`), not a month grid.

- **Rows** = members (`profiles` → resource id = profile `id` uuid string).
- **Bars** = stays (attendance periods).
- **Scale** = day columns; headers Month + Day.
- Default window ≈ current week Monday → ~2 years (existing config).
- Interactions to preserve:
  - People search + pin/compare selected members
  - Drag move / resize (permission-gated)
  - Drag-select range to create draft stay
  - Event click → edit modal (own, or any member when admin) or read-only modal (others for non-admins)
  - Soft-delete mark (×) then commit on Save
  - Draft vs saved visual status (`ready` / `unsaved` / `saved`)
  - Floating save / discard with leave guards
  - Settings: font/cell width, date range
  - Fixed Sandstone (flat) palette for members / own row
  - “Manage availability” modal table (title / start / end / note); admins can search/select a member and edit that member’s stays in the same form

Primary files to evolve (not replace):

- `app/components/scheduler.tsx`
- `app/components/availability-modal.tsx`
- `app/community-calendar/page.tsx`
- `app/lib/color-schemes.ts`
- `app/styles/brown_theme.css`

### 8.2 Domain fields (stay)

| Concept       | UI / DayPilot         | Database column                      |
| ------------- | --------------------- | ------------------------------------ |
| Id            | event `id`            | `attendance.id` uuid                 |
| Owner         | `resource`            | `attendance.user_id` → `profiles.id` |
| Display title | `tags.title` / `text` | `title` text not null                |
| Note          | `tags.note`           | `note` text null                     |
| Start day     | `start` date          | `start_date` date                    |
| End day       | see §8.3              | `end_date` date (**inclusive**)      |

Overlapping stays for the same user are **allowed** (existing product).

### 8.3 Inclusive vs exclusive end dates (critical)

DayPilot bars use an **exclusive** end instant (seed comments already document this). Users enter **inclusive** checkout/end dates in the modal (“leave on this day”).

**Contract:**

- Database stores **inclusive** `start_date` / `end_date` (calendar days the person is present).
- Constraint: `start_date <= end_date`.
- Adapter when loading into DayPilot: `schedulerEnd = end_date + 1 day` at `T00:00:00`.
- Adapter when saving from DayPilot / modal: convert exclusive scheduler end → inclusive `end_date`.

Do not change the modal field labels or user-facing “end date” meaning.

### 8.4 Draft / save model (preserve)

Existing mental model is a **client draft buffer** then a single commit:

| Role    | Save merge semantics (keep)                                                   |
| ------- | ----------------------------------------------------------------------------- |
| `user`  | Replace **only that user’s** stays in the persisted set with committed drafts |
| `admin` | Persist the full committed event set they edited                              |

Implement as:

- Preferred: one server action / RPC `save_attendance_batch` that accepts the member’s (or admin’s) committed stays + deleted ids, validates permissions, writes atomically, returns fresh rows.
- Alternative: per-row CRUD if batch is hard — but UI must still feel like draft→Save.

Soft-delete: client marks `markedForDeletion`; only hard-delete on successful save.

### 8.5 Past attendance visibility

**Existing UI:** Default scheduler `startDate` is “this week,” so older bars fall outside the window. Date-range settings can scroll earlier. There is **no** hard client filter removing past rows from the dataset.

**Refined rule for v1:**

- **Default query for scheduler:** `end_date >= current_date` OR stays that intersect the visible date window (preferred: load stays intersecting `[viewStart, viewEnd]`).
- Do **not** permanently delete past stays.
- Members do not get a dedicated “history archive” screen in v1.
- Admins may later filter/include history in App Admin; optional.

“Completely passed = `end_date < current_date` hidden from default member calendar” remains valid as the **default filter**, matching product intent without fighting the DayPilot UX.

### 8.6 Permissions on attendance

| Actor  | Select                                 | Insert                            | Update   | Delete   |
| ------ | -------------------------------------- | --------------------------------- | -------- | -------- |
| Member | Others’ current/window stays (and own) | Own only (`user_id = auth.uid()`) | Own only | Own only |
| Admin  | All (incl. history if requested)       | Any user                          | Any      | Any      |

RLS must enforce; UI gates drag/edit via `canEditResource` (session user + admin flag). Admins can also retarget the Manage availability form to any member (member search above the table); saves use that member’s `user_id`. Non-admins always edit themselves.

---

## 9. Listings (locations) — UI truth + DB contract

### 9.1 Terminology

Prefer **listing** / **place** in code and admin UI. Public site already says Food & Dining, Services, etc. Avoid ChatGPT plan labels (“Restaurants”, “Wellness”) as enum values.

### 9.2 Existing Listing shape (retain / migrate)

From `lib/listings-search.ts`:

```ts
type Listing = {
	name: string;
	type: string | null; // subtype, e.g. restaurant kind
	address: string | null;
	contact: string | null;
	remark: string | null; // free-form note (≈ “description”)
	category: string; // slug
	sourceUrl: string;
	tags: string[];
	lat?: number | null;
	lng?: number | null;
};
```

### 9.3 Categories (repo truth)

Enum / check constraint must use existing slugs:

| Slug                   | Label                  |
| ---------------------- | ---------------------- |
| `food-dining`          | Food & Dining          |
| `services-maintenance` | Services & Maintenance |
| `health-wellness`      | Health & Wellness      |
| `shop-market`          | Shop & Market          |

Matches routes: `/food-dining`, `/services-maintenance`, `/health-wellness`, `/shop-market`.

### 9.4 Existing UI to preserve

`MockMap` composition (evolve naming away from “mock” when convenient):

1. Search input with suggestions (tags + place names).
2. Active tag chips (AND filter).
3. Results list: **non-card** label/value rows (`Category`, `Name`, `Type`, `Contact`, `Remark`).
4. Map showing pins for the relevant set (filtered when searching; all geocoded when idle).
5. Selecting a place focuses that result + marker; bounds fit pins.

Search matching today: **name, type, tags** (accent-insensitive fuzzy). Address is **not** required for v1 search; optional enhancement: add address to `listingMatchesQuery` without redesigning the panel.

### 9.5 Map stack

- Keep `@vis.gl/react-google-maps` + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Center default: Castel Falfi (`43.5419`, `10.9706`).
- Geocode **writes** (admin) must go through a secure backend; do not expose privileged Geocoding keys if restricted. Browser Maps JS key stays public with HTTP referrer restrictions.

### 9.6 Tables

**`listings`**

| Column                  | Type                  | Notes                               |
| ----------------------- | --------------------- | ----------------------------------- |
| id                      | uuid PK               |                                     |
| name                    | text not null         |                                     |
| type                    | text null             | subtype                             |
| address                 | text null             | required before publish in admin UX |
| contact                 | text null             |                                     |
| remark                  | text null             |                                     |
| category                | enum/check            | four slugs above                    |
| source_url              | text null             | migrated from JSON                  |
| latitude                | double precision null | required to show pin                |
| longitude               | double precision null | required to show pin                |
| created_by              | uuid null             | FK profiles                         |
| updated_by              | uuid null             |                                     |
| created_at / updated_at | timestamptz           |                                     |

Constraints: lat ∈ [-90,90], lng ∈ [-180,180] when not null. Pin display requires both coords.

**`listing_tags`**

| Column     | Type                                                          |
| ---------- | ------------------------------------------------------------- |
| id         | uuid PK                                                       |
| name       | text unique (store display form; unique on lower(trim(name))) |
| created_by | uuid                                                          |
| created_at | timestamptz                                                   |

**`listing_tag_assignments`**

| location/listing_id | tag_id | unique pair |

Normalize tags for admin creatable multi-select; hydrate `tags: string[]` in API responses so existing `listings-search` helpers stay usable.

### 9.7 Listing permissions

| Actor  | Read                         | Write                                     |
| ------ | ---------------------------- | ----------------------------------------- |
| Member | Yes (all published listings) | No                                        |
| Admin  | Yes                          | Create / update / delete + tag management |

No member-authored listings in v1.

### 9.8 Geocoding (admin) — backend plan retained

Flows to implement in App Admin listing form:

1. Address → backend `geocode_listing` → candidates → preview marker → confirm.
2. Failure / ambiguity → “Find on map” (click/drag marker) → confirm.
3. Persist lat/lng only after confirm.

Reuse `LocationsMap` patterns for preview; do not invent a second map library.

---

## 10. Profiles & privacy

### `profiles`

| Column                  | Type                      | Notes               |
| ----------------------- | ------------------------- | ------------------- |
| id                      | uuid PK = `auth.users.id` |                     |
| full_name               | text not null             | Scheduler row label |
| avatar_url              | text null                 |                     |
| role                    | `user` \| `admin`         | default `user`      |
| created_at / updated_at | timestamptz               |                     |

Email stays in `auth.users`. Admins resolve email via secure admin API / privileged view — **not** via a profiles column exposed to RLS `select` for members.

Members may update only own `full_name`, `avatar_url`. Role changes only via `change_user_role` admin function + audit.

Avatar storage: Supabase Storage bucket with RLS (owner write; authenticated read) — implement when building Account page.

---

## 11. Invitations & audit (backend plan retained)

### `user_invitations`

Statuses: `pending` | `accepted` | `expired` | `cancelled`

Columns as previously planned (`email`, `invited_by`, timestamps, `auth_user_id`, etc.).

- Partial unique index: one `pending` invitation per normalized email.
- Admin-only read/write via backend functions.

### `admin_audit_log`

Append-only from trusted server paths / triggers. Record at least:

- invite / resend / cancel
- promote / demote / delete user
- listing create / update / delete
- tag create (optional)
- admin edits to another user’s attendance

Members’ self-edits to attendance/profile need not appear.

Clients: select for admins only; no insert/update/delete from client.

---

## 12. RLS summary

Enable RLS on every app table.

| Table                         | Member                                                          | Admin                                                  |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| profiles                      | Select public fields (id, name, avatar); update own name/avatar | Select all needed via policies or admin RPC for emails |
| attendance                    | Select intersecting window / non-expired; mutate own            | Full mutate                                            |
| listings + tags + assignments | Select                                                          | Full mutate                                            |
| user_invitations              | None                                                            | Via backend / admin policies carefully                 |
| admin_audit_log               | None                                                            | Select only                                            |

Prefer **privileged Edge Functions / Server Actions with service role** for invitations, role change, delete user, geocode, and audit writes — even when table policies exist — so business rules (final admin, duplicate invite) stay in one place.

---

## 13. Secure backend functions (inventory)

| Function                                               | Responsibility                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `is_admin`                                             | Helper                                                                                                         |
| `invite_user`                                          | Admin check, dedupe, invite, invitation row, audit                                                             |
| `resend_invitation`                                    |                                                                                                                |
| `cancel_invitation`                                    |                                                                                                                |
| `change_user_role`                                     | Final-admin guard + audit                                                                                      |
| `delete_user`                                          | Final-admin / self-handoff guard; delete auth user; purge future attendance; keep audit; decide avatar cleanup |
| `save_attendance_batch`                                | Enforce role merge rules; validate dates; return rows                                                          |
| `geocode_listing`                                      | Proxy Google Geocoding                                                                                         |
| `create_listing` / `update_listing` / `delete_listing` | Validate, tags, coords, audit                                                                                  |

Implementation host: Supabase Edge Functions **or** Next.js Route Handlers / Server Actions under `app/` with service role. Prefer one pattern and stick to it.

---

## 14. Route structure (aligned with repo)

### Public / auth

| Route                                     | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| `/sign-in`                                | Email + password (no register link) |
| `/accept-invite`                          | Set password from invite            |
| `/forgot-password`                        | Request reset                       |
| `/reset-password`                         | Complete reset                      |
| `/`, `/about`, `/events`, category routes | Existing Tina pages                 |

### Members (authenticated)

| Route                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `/place`              | Members hub (gate after auth)        |
| `/community-calendar` | Attendance scheduler (**keep path**) |
| `/account`            | Profile + password                   |

Fix or remove dead `/add-attendance` link in `content/pages/place.md` (point to calendar or account).

### App admin (authenticated + admin role)

| Route                        | Purpose                      |
| ---------------------------- | ---------------------------- |
| `/members/admin`             | Dashboard counts + shortcuts |
| `/members/admin/users`       | Users table / roles / delete |
| `/members/admin/invitations` | Invite + pending + history   |
| `/members/admin/listings`    | Listing CRUD + geocode UI    |
| `/members/admin/audit-log`   | Read-only audit              |

### CMS

| Route    | Purpose                 |
| -------- | ----------------------- |
| `/admin` | Tina (unchanged for v1) |

---

## 15. UI component inventory (repo-first)

### Keep / evolve

| Component                    | Path                                    | Notes                          |
| ---------------------------- | --------------------------------------- | ------------------------------ |
| Scheduler                    | `app/components/scheduler.tsx`          | Wire to Supabase; remove mocks |
| AvailabilityModal / ReadOnly | `app/components/availability-modal.tsx` | Form table; admin member retarget |
| member-search helpers        | `lib/attendance/member-search.ts`       | Shared fuzzy find for people       |
| MockMap → rename later       | `components/ui/mock-map.tsx`            | Data from Supabase             |
| LocationsMap                 | `components/ui/locations-map.tsx`       | Keep                           |
| listings-search helpers      | `lib/listings-search.ts`                | Keep scoring API               |
| SiteHeader / Footer / Logo   | `components/layout/*`                   | Add auth menu later            |
| shadcn primitives            | `components/ui/*`                       | Dialogs, tables, forms         |

### Add (net-new)

- Auth forms (sign-in, invite accept, password flows)
- Account page (avatar upload, name, password)
- Permission-denied / gated layout for members & app admin
- App admin shells: users, invitations, listings form (creatable tag multi-select), audit table
- Confirmation dialogs for promote / demote / delete (reuse shadcn Dialog)
- Session provider / middleware for route protection

### Do **not** rebuild as a month calendar

The ChatGPT “Main Calendar Components” list (month heading, Today button as primary metaphor, availability “blocks” on a date grid) is **superseded** by the DayPilot resource scheduler already in the repo.

---

## 16. Permissions matrix (condensed)

| Resource / action                   | User       | Admin                           |
| ----------------------------------- | ---------- | ------------------------------- |
| Sign in                             | Yes        | Yes                             |
| View attendance in scheduler window | Yes        | Yes                             |
| Create overlapping own stays        | Yes        | Yes                             |
| Edit/delete own stays               | Yes        | Yes                             |
| Manage others’ stays                | No         | Yes                             |
| View listings / search / map        | Yes\*      | Yes                             |
| Mutate listings / tags              | No         | Yes                             |
| View others’ emails                 | No         | Yes                             |
| Update own profile / password       | Yes        | Yes                             |
| Change own role                     | No         | Only via admin action on others |
| Invitations                         | No         | Yes                             |
| Promote / demote / delete users     | No         | Yes, with final-admin rules     |
| App audit log                       | No         | Read                            |
| Tina `/admin`                       | Orthogonal | Orthogonal                      |

\*Subject to gating decision in §5.

---

## 17. Indexes & search performance

**Attendance:** `(user_id)`, `(start_date, end_date)`, optionally GiST/range if filtering by window becomes heavy.

**Listings:** `(category)`, `(name)`, trigram (`pg_trgm`) on `name`, `type`, and tag names for optional server-side fuzzy search. v1 may keep client-side filter over fetched listings if count stays ~100.

**Invitations:** `(status)`, `(email)`, partial unique pending email.

**Audit:** `(created_at desc)`, `(admin_user_id)`, `(action)`.

---

## 18. Env & secrets

| Var                                  | Where                | Notes                          |
| ------------------------------------ | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`    | Client               | Existing; restrict by referrer |
| `NEXT_PUBLIC_SUPABASE_URL`           | Client               | New                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Client               | New; RLS-bound                 |
| `SUPABASE_SERVICE_ROLE_KEY`          | Server only          | Never `NEXT_PUBLIC_`           |
| Google Geocoding key                 | Server only          | If separate from Maps JS key   |
| Tina `clientId` / `token` / `branch` | Existing Tina config | Unrelated to app roles         |

Document in `.env.example` when Supabase is added (do not commit `.env.local`).

---

## 19. Design & UX constraints (existing brand)

When adding auth/admin screens:

- Preserve APIC header/footer, brown palette (`#805b32` / `#7A5A32`), Playfair + body fonts.
- Prefer existing non-card listing presentation on member-facing browse UI.
- Admin tables may use denser table layouts (already used in AvailabilityModal).
- Avoid inventing a parallel design system for “product” vs marketing.

---

## 20. Confirmed product decisions (updated)

1. Two roles: `user`, `admin`.
2. Domain is **member attendance / stays**, surfaced by the existing DayPilot scheduler.
3. Stays use calendar dates; overlapping stays allowed; title + note required/optional as today.
4. DB end dates are **inclusive**; DayPilot adapter uses exclusive end.
5. Draft → Save / Discard UX and soft-delete-until-save are required.
6. Past stays: keep in DB; default member load excludes fully past stays / loads by visible window.
7. Listings use existing four category slugs and field model (`type`, `contact`, `remark`, tags).
8. Map: Google Maps JS via current component; geocode writes via secure backend.
9. Tags normalized in DB; API still exposes `string[]` for UI.
10. Invitation-only registration; emails admin-only.
11. Final admin cannot be demoted/deleted into a zero-admin state.
12. App admin ≠ Tina `/admin`; use `/members/admin/*`.
13. Tina continues to own marketing pages; Supabase owns members, stays, listings.
14. Do not redesign the scheduler into a month-grid calendar for v1.

---

## 21. Open decisions (resolve at implementation start)

| ID  | Question                                                   | Recommendation                                                                                |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| O1  | Gate listings/maps behind auth, or keep public teaser?     | Authed full data; public CTA on category pages                                                |
| O2  | On user delete: hard-delete all attendance vs only future? | Delete all attendance; retain audit with user id + summary                                    |
| O3  | Edge Functions vs Next Server Actions for admin ops?       | Next Server Actions if team lives in App Router; else Edge for invite emails next to Supabase |
| O4  | Rename `MockMap` / Tina block `mockMap`?                   | Yes, when touching Tina schema (`LocationsMap` block)                                         |
| O5  | Category pages filter listings by category?                | Yes after Supabase — `categoryFromPathname` already exists unused                             |

---

## 22. Suggested build phases (for later breakdown)

**Detailed, independently testable PRs:** see [`pr-plan.md`](./pr-plan.md) (includes Supabase CLI + MCP workflow for the GitHub-linked project).

Use these as PR / epic boundaries:

1. **Foundation** — Supabase project, env, clients, `profiles` + trigger on signup, middleware session helpers, sign-in/out, protect `/community-calendar` + `/place` + `/account`.
2. **Invitations** — `user_invitations`, invite/resend/cancel functions, accept-invite UI, audit log table + writes for invite actions.
3. **Attendance persistence** — `attendance` table + RLS + `save_attendance_batch`; adapt scheduler off localStorage; remove mock login.
4. **Account** — profile name/avatar Storage; password change.
5. **Listings migration** — schema + seed from JSON; switch MockMap to Supabase fetch; category filter; geocode remaining pins (admin tool or script).
6. **App admin listings** — CRUD UI, tags creatable select, geocode flows, audit.
7. **App admin users** — list with emails, promote/demote/delete + final-admin guards + audit.
8. **App admin dashboard + audit UI** — counts, recent actions, audit browser.
9. **Hardening** — indexes, email templates, rate limits, replace dead links, rename mockMap, O1/O5 product polish.

---

## 23. File map (implementation anchors)

```
app/components/scheduler.tsx           # attendance UI (evolve)
app/components/availability-modal.tsx  # stay form UX (evolve)
app/community-calendar/page.tsx        # route
components/ui/mock-map.tsx             # listings search UI
components/ui/locations-map.tsx        # Google Map
lib/listings-search.ts                 # Listing type + fuzzy helpers
content/data/listings.json             # seed only after cutover
tina/config.ts                         # marketing CMS only
next.config.ts                         # /admin → Tina (keep)
components/layout/site-header.tsx      # auth entry later
docs/developer/architecture-spec.md    # this document
```

---

## 24. Traceability: ChatGPT plan → this spec

| Original section                                 | Disposition                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Roles / matrix / final admin                     | Kept                                                                          |
| Invite-only Auth + service role                  | Kept                                                                          |
| profiles / invitations / audit tables            | Kept                                                                          |
| RLS outlines                                     | Kept (refined)                                                                |
| Backend function list                            | Kept + `save_attendance_batch`                                                |
| Month-style calendar component inventory         | **Replaced** by DayPilot scheduler UX                                         |
| Availability table                               | Renamed conceptually to **attendance**; inclusive dates + adapter             |
| Location categories Services/Restaurants…        | **Replaced** by existing four slugs                                           |
| Location fields description-only                 | **Replaced** by Listing shape                                                 |
| `/availability`, `/locations`, `/admin/*` routes | **Replaced** by `/community-calendar`, category/map pages, `/members/admin/*` |
| Locations page order Map→Search→Register         | **Replaced** by existing MockMap order/behaviour                              |
| Fuzzy search name/category/address/tags          | **Partial**: name/type/tags now; address optional later                       |
| Shared generic “component inventory”             | Filtered to keep/evolve vs add                                                |

This document is the single spec to split into implementation tickets.
`)
