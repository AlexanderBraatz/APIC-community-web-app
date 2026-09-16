# APIC Community — Technical handover (insurance document)

**Audience:** Client stakeholders and any incoming developer or agency  
**Purpose:** Continuity if the original developer company is unavailable — enough detail to clone, provision accounts, wire environment, migrate access, and relaunch production.  
**Last updated:** 2026-09-16

---

## 1. Purpose of this document

This is a **relaunch / insurance** guide. It lists the product, stack, third-party accounts, environment variables, repository layout, and a step-by-step procedure to stand up a working app.

**Important — access to data and accounts**

Secrets are **not** stored in this document or in git. Live keys live in Vercel project env and local `.env.local` (gitignored).

A new maintainer should **request access** (owner invite or credential handoff) from the **client / current operators** for each system listed in §4 and §5. The original developer can assist with transfer when reachable (see §11). Do not invent or embed live credentials here.

---

## 2. Product overview

Private platform for members of a holiday community (Castelfalfi / APIC).

It is **not** a property booking or rental-availability product. Domain language prefers attendance / stays / “who is here.” The attendance UI lives at `/community-calendar`.

### Members can

- Sign in after invitation (no public self-registration)
- View and manage attendance on the community calendar
- Browse local listings (places), search/filter, view on Google Maps
- Manage their own profile and password

### Admins can

- Everything members can
- Invite users; resend / cancel invitations
- Manage users and roles; delete users (with final-admin safeguards)
- Manage any member’s attendance
- Create / edit / delete listings and tags
- View the administrative audit log at `/members/admin/audit-log`
- Edit marketing pages and blog via TinaCMS `/admin`

### Out of scope for v1

- Public registration
- Messaging / chat product backend
- Booking units, payments, or inventory
- Replacing TinaCMS for marketing page editing

**Data ownership**

| Data | System of record |
| --- | --- |
| Live member data (profiles, invites, attendance, listings, audit log) | Supabase |
| Marketing pages / blog content | TinaCMS content in git (`content/`) + TinaCloud |

---

## 3. Tech stack (what runs where)

| Layer | Technology |
| --- | --- |
| App framework | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS |
| Hosting / deploys | Vercel (`tinacms build && next build`) |
| Auth + database + RLS | Supabase (hosted Postgres, Auth, service role for admin ops) |
| CMS | TinaCMS / TinaCloud — marketing pages & blog; UI at `/admin` |
| Attendance UI | DayPilot Lite scheduler (`app/components/scheduler.tsx`) |
| Maps / places | Google Maps JavaScript API, Places API, Geocoding |
| AI helpers | OpenAI — admin tag suggest / alias backfill |
| Error monitoring | Sentry EU (`de.sentry.io`) — always on when DSN is set |
| Product analytics | PostHog EU (`eu.i.posthog.com`) — consent-gated |
| Auth email redirects | Supabase Auth + `NEXT_PUBLIC_SITE_URL` |
| One-off data scripts | `scripts/` (seed listings, attendance, enrich places, etc.) |

---

## 4. Required third-party accounts

Request ownership transfer or admin invite for each console. Secrets stay in Vercel / `.env.local` only.

| Account | Why the app needs it | Required for relaunch? | Notes |
| --- | --- | --- | --- |
| **Git host** (e.g. GitHub) | Source repo, PRs, optional CI | **Yes** | Clone and history |
| **Vercel** | Production + preview deploys; production env vars | **Yes** | Domain + build settings |
| **Supabase** | Auth, Postgres, RLS, invites, service role | **Yes** | Project ref / API URL in dashboard |
| **TinaCloud** | CMS auth (`NEXT_PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN`) | **Yes** for content editing & Tina build step | Also used at build time |
| **Google Cloud** | Maps JS, Places, Geocoding API keys | **Yes** for map / place features | Restrict Maps key by HTTP referrer; server keys by IP in prod |
| **OpenAI** | Admin tag suggest / alias backfill | Optional for core app; **required** for those AI admin features | Server-only `OPENAI_API_KEY` |
| **PostHog** (EU) | Product analytics + session replay | Optional — omit key to disable | Prefer separate projects for local vs production |
| **Sentry** (EU `de.sentry.io`) | Errors, source maps, optional Slack alerts | Strongly recommended | Separate projects for local vs production |
| **Domain / DNS** | Production hostname → Vercel | **Yes** for public relaunch | Must match `NEXT_PUBLIC_SITE_URL` / Auth redirect URLs |
| **Slack** | Optional Sentry alert destination | Optional | Configured in Sentry UI, not app env |
| **Vimeo** | Admin dashboard walkthrough embeds only | Not required to run the app | Optional |

---

## 5. Data ownership and how to request access

| System | What you get access to | How to request |
| --- | --- | --- |
| **Supabase** | Member profiles, invitations, attendance, listings, audit log, Auth users | Client invites new maintainer as project owner/admin, or transfers project |
| **TinaCloud + git `content/`** | Marketing pages, blog Markdown | TinaCloud project invite + git repo access |
| **PostHog** | Analytics events, session recordings | Project/org invite (EU cloud) |
| **Sentry** | Error history, releases, alerts | Org/project invite (EU `de.sentry.io`) |
| **Vercel** | Deploy history, env vars, domains | Team/project invite |
| **Google Cloud** | API keys, quotas, billing | GCP project IAM |
| **OpenAI** | API usage for tag/AI features | Org invite or new key under client billing |

Access requests go through the **client**. The original developer (§11) can help with handoff when available.

If migrating an existing production community: prefer **transferring** the Supabase project (and Auth users) over starting empty, so membership and attendance history are preserved. Always preserve RLS policies and final-admin safeguards from `supabase/migrations/`.

---

## 6. Repository map

| Path | Role |
| --- | --- |
| `app/` | Next.js routes — public site, `/place`, `/community-calendar`, `/members/admin/*`, auth flows |
| `components/` | UI — admin, maps, analytics, blog blocks |
| `lib/` | Server actions & clients — Supabase, admin, audit, invitations, listings |
| `supabase/migrations/` | **Source of truth** for schema, RLS, DB functions |
| `content/` | Tina pages, blog posts, static CMS content |
| `docs/developer/` | Architecture, Supabase, monitoring, Sentry alerts, this handover |
| `public/` | Static assets; downloadable PDF at `public/docs/apic-community-handover.pdf` |
| `scripts/` | Seed / enrich / migrate helpers (listings, attendance, places) |
| `.env.example` | Canonical list of env var names (no secrets) |

Useful npm scripts:

- `npm run dev` — Tina + Next local
- `npm run build` / `npm start` — production build
- `npm run supabase:login` / `supabase:link` / `supabase:db:push`
- `npm run supabase:types` — regenerate TypeScript DB types
- `npm run seed:listings` / `seed:attendance` / related migrate scripts
- `npm test`

---

## 7. Environment variables (complete checklist)

Copy `.env.example` → `.env.local` for local work. Set the same keys on the **Vercel** project for production/preview. Use **separate** PostHog and Sentry projects/keys for local vs production where practical.

### Google

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public | Maps JavaScript API (referrer-restricted) |
| `GOOGLE_PLACES_API_KEY` | Server | Places API (New) — autocomplete / place details |
| `GOOGLE_GEOCODING_API_KEY` | Server | Geocoding (falls back chain documented in `.env.example`) |

### Supabase

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | RLS-bound anon/publishable key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Optional alias; code can fall back to anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Invites, admin deletes, privileged ops — never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | Public | Site origin for auth email redirects (e.g. `https://your-domain.com`) |

### OpenAI

| Variable | Scope | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | **Server only** | Admin tag suggest / alias backfill |

### TinaCMS / TinaCloud

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TINA_CLIENT_ID` | Public | TinaCloud client id |
| `TINA_TOKEN` | **Server only** | TinaCloud token (also on Vercel for builds) |

### PostHog (EU)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | Omit locally to disable (no-op provider) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | Default `https://eu.i.posthog.com` |

### Sentry (EU)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Client/server DSN (`ingest.de.sentry.io`); omit locally to disable |
| `SENTRY_DSN` | Server | Optional server-only alias |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Public | Optional override: `development` \| `preview` \| `production` |
| `SENTRY_ORG` | CI / Vercel | Org slug for source map upload |
| `SENTRY_PROJECT` | CI / Vercel | Project slug |
| `SENTRY_AUTH_TOKEN` | CI / Vercel | Auth token — never commit |

Anything prefixed `NEXT_PUBLIC_` is visible in the browser bundle. Treat service role, Tina token, OpenAI, and Sentry auth token as highly sensitive.

---

## 8. Relaunch / clone procedure

1. **Gain access** to the git repo and request account access for the systems in §4–§5.
2. **Clone** the repository; run `npm install`.
3. **Supabase:** create a new project **or** take ownership of the existing one. Link with `npx supabase link` / `npm run supabase:link`. Apply migrations with `npm run supabase:db:push`. Regenerate types with `npm run supabase:types` if the schema changed.
4. **Auth settings (Supabase dashboard):** public sign-ups disabled (invitation-only); Site URL + Redirect URLs match the app origin (include `/auth/confirm`); set `NEXT_PUBLIC_SITE_URL` accordingly.
5. **TinaCloud:** connect the repo; set `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`.
6. **Google Cloud:** enable Maps JavaScript API, Places, Geocoding; create restricted keys as in `.env.example` / `docs/developer/supabase.md`.
7. **Optional:** create PostHog EU and Sentry EU projects (dev + prod). Wire Slack alerts per `docs/developer/sentry-alerts.md` if desired.
8. **Env:** fill `.env.local` from `.env.example`; mirror values on Vercel for Production (and Preview as needed).
9. **Domain:** point DNS at Vercel; confirm Auth redirect URLs and `NEXT_PUBLIC_SITE_URL`.
10. **Deploy:** `npm run build` locally to verify, then deploy via Vercel.
11. **Smoke-test:** invite/accept invite; member login; attendance calendar; listings map; Tina `/admin`; `/members/admin` (users, invitations, listings, tags); audit log; Sentry test error if DSN set; PostHog only when consent on.

Local Docker (`supabase start`) is optional; cloud-linked `db push` is enough for typical maintenance.

---

## 9. Roles, routes, and operational surfaces

### App admin (`/members/admin`)

| Route | Purpose |
| --- | --- |
| `/members/admin` | Dashboard (counts, walkthroughs, handover PDF, developer contact) |
| `/members/admin/users` | Roles, promote/demote, delete |
| `/members/admin/invitations` | Invite / resend / cancel |
| `/members/admin/listings` | CRUD listings |
| `/members/admin/tags` | Tag management + AI helpers |
| `/members/admin/audit-log` | Read-only audit of sensitive admin actions |

Non-admins hitting `/members/admin/*` are redirected (typically to `/place`).

### CMS admin

- Tina static admin at `/admin` (marketing pages, blog collections). Unrelated to Supabase Auth session for members.

### Audit logging

Sensitive admin actions write to `admin_audit_log` (invites, role changes, user deletes, listing/tag changes, etc.). Admins can read via the audit log UI; RLS prevents non-admin writes from the client.

---

## 10. Deeper references

| Doc | Covers |
| --- | --- |
| [architecture-spec.md](./architecture-spec.md) | Product/system architecture, data model, permissions |
| [supabase.md](./supabase.md) | Project link, migrations, Auth, Maps keys, checklists |
| [monitoring.md](./monitoring.md) | Sentry + PostHog mental model and env vars |
| [sentry-alerts.md](./sentry-alerts.md) | EU Sentry projects, Slack alerts, verification |
| [../user-stories.md](../user-stories.md) | Product user stories |
| [README.md](./README.md) | Index of developer docs |

---

## 11. Original developer contact

**Alexander Braatz**

- WhatsApp: +44 7394 913192 — https://wa.me/447394913192
- Email: alex_braatz@icloud.com
- Website: https://alexanderbraatz.com

Data and account access requests should go through the **client**. The original developer can help with technical handoff when reachable.
