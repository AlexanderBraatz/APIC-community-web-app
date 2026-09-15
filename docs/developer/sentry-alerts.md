# Sentry + Slack alerts (ops)

Essential error monitoring is always on via `@sentry/nextjs`. Product analytics and consent-gated full session replay stay in PostHog. Sentry Session Replay is production + error-only only (see below).

For the full monitoring overview (Sentry + PostHog), see [monitoring.md](./monitoring.md).

**Region: EU** — use [https://de.sentry.io](https://de.sentry.io) for the org, projects, tokens, Slack integration, and alerts. Do **not** mix with `sentry.io` (US). DSNs will look like `https://…@….ingest.de.sentry.io/…`.

App wiring is done in code. Alert routing is configured in the **Sentry UI** (not app env vars).

## Projects

| Environment | Sentry project (suggested slug) | Slack alerts |
| --- | --- | --- |
| Local / development | `apic-community-dev` | **None** |
| Production | `apic-community-prod` | `#apic-errors` |

Use separate DSNs per environment (`NEXT_PUBLIC_SENTRY_DSN`). Optionally set `NEXT_PUBLIC_SENTRY_ENVIRONMENT` / rely on `VERCEL_ENV`.

### Create projects (EU)

1. Log in: https://de.sentry.io/auth/login/
2. Org home: https://de.sentry.io/organizations/
3. New project: https://de.sentry.io/organizations/{org}/projects/new/  
   Platform: **Next.js** (or JavaScript/React). Create **dev**, then **prod**.
4. Copy each DSN: https://de.sentry.io/settings/{org}/projects/{project}/keys/

## Build secrets (Vercel / CI)

Set on the production (and preview, if desired) project only:

- `NEXT_PUBLIC_SENTRY_DSN` — **prod** DSN from EU (`ingest.de.sentry.io`)
- `SENTRY_ORG` — org slug from `https://de.sentry.io/organizations/{org}/…`
- `SENTRY_PROJECT` — **prod** project slug
- `SENTRY_AUTH_TOKEN` — org auth token from https://de.sentry.io/settings/{org}/auth-tokens/  
  (scopes: at least `project:releases`, plus `org:read` / project read as required by the UI)

Local builds omit the auth token; source map upload is skipped with a warning.

Optional local `.env.local`: set `NEXT_PUBLIC_SENTRY_DSN` to the **dev** DSN, or omit to disable.

## Slack integration (production project only)

1. Integrations: https://de.sentry.io/settings/{org}/integrations/
2. Slack: https://de.sentry.io/settings/{org}/integrations/slack/
3. Connect the Slack workspace → channel **`#apic-errors`**
4. Attach / use only with the **production** project (not the local/dev project)

Slack third-party alerts usually require a paid Sentry plan; free Developer may be email-only.

## Alert rules (production only)

Create on the **prod** project only:

https://de.sentry.io/organizations/{org}/alerts/rules/?project={project}

Prefer signal over noise — do **not** alert on every event. On the **dev** project, disable default “notify on every new issue” Slack/email noise if present.

Suggested rules:

1. **New high-severity issue**
   - Condition: A new issue is created AND level is `error` or higher (or “high priority” if using Sentry priority)
   - Filter: environment `production`
   - Action: Send Slack notification to `#apic-errors`
   - Frequency: every issue (or at most once per issue)

2. **Error-rate spike**
   - Condition: Number of events in an issue is more than N in T minutes (tune after a quiet baseline, e.g. >20 in 10 minutes)
   - Action: Slack `#apic-errors`
   - Include environment filter: `production`

3. **Repeated failures on critical workflows** (optional, after tags appear)
   - Filter by tag `area:server_action` and actions such as `save_attendance_batch`, `invite_user`, `complete_invite_acceptance`
   - Condition: same issue seen repeatedly within a short window
   - Action: Slack `#apic-errors`

### Notification content

Keep defaults that include:

- Environment
- Issue title
- Approximate event count
- Link to the Sentry issue (will be on `de.sentry.io`)
- Route / transaction name when available

Do **not** expect member email, stay notes, or passwords in payloads — the app scrubs those before send. Still avoid pasting raw event extras into other channels.

## What not to configure

- No Slack alerts on the local/dev Sentry project
- No WhatsApp
- Email fallback in Sentry is optional; Slack is the primary path
- Sentry Session Replay: **production + error-only** (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1`). Off in local/preview. Quota is consumed when a replay is captured, not when you watch it. Consent-gated product replay remains PostHog.
- Do not create the org on US `sentry.io` if you chose EU

## Verification checklist

- [ ] Org and both projects live on **https://de.sentry.io** (DSN host contains `ingest.de.sentry.io`)
- [ ] Throw a test client error with DSN set → appears in the correct EU Sentry project, scrubbed (no cookies/auth headers/emails)
- [ ] Decline PostHog analytics → Sentry errors still arrive
- [ ] Production Slack rule fires to `#apic-errors` only
- [ ] Dev project has no Slack rule
