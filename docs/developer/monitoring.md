# Monitoring cheat sheet

Quick orientation for Sentry + PostHog in this app. Part of [developer docs](./README.md). For Slack alert setup detail, see [sentry-alerts.md](./sentry-alerts.md).

## Mental model

| Tool | Purpose | Consent? | Region |
| --- | --- | --- | --- |
| **Sentry** | Errors, traces, **error-only** Session Replay in prod | **No** — always on when DSN is set | EU (`de.sentry.io`) |
| **PostHog** | Product analytics events + optional full session recording | **Yes** — member toggles in Account / invite | EU (`eu.i.posthog.com`) |

They are independent: declining PostHog does **not** turn off Sentry.

```text
Member hits a bug
  → Sentry gets the error (always, if DSN set)
  → In production only: Sentry may attach an error Replay (~1 min before + after)

Member browses with analytics ON
  → PostHog gets named events (page_view, stay_created, …)

Member has session recording ON
  → PostHog records the session (masked inputs; off on auth pages)
```

## Env vars (see `.env.example`)

**Sentry**

- `NEXT_PUBLIC_SENTRY_DSN` — omit locally to disable; use **dev** DSN local, **prod** DSN on Vercel
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT` — optional override (`development` \| `preview` \| `production`); else `VERCEL_ENV` / `NODE_ENV`
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — Vercel/CI only, source maps

**PostHog**

- `NEXT_PUBLIC_POSTHOG_KEY` — omit locally to disable (no-op)
- `NEXT_PUBLIC_POSTHOG_HOST` — default `https://eu.i.posthog.com`

Use **separate** Sentry projects and PostHog projects (keys) for local vs production.

## Sentry — what we ship

**Always-on error monitoring** (client + server + edge), privacy-scrubbed:

- No default PII; events scrubbed in `lib/sentry/scrub.ts`
- Critical server actions call `captureServerActionException` (`lib/sentry/capture.ts`) with tags `area:server_action` + action name
- Tunnel: `/sentry-tunnel` (also excluded from auth proxy)
- Client test control: Account page → “Sentry (development only)” button
- **User Feedback** floating widget (client-only in `instrumentation-client.ts`, styled to match brown CTAs in `globals.css`) — independent of PostHog consent; only when DSN is set

**Session Replay (Sentry)** — production + error-only only:

| Env | Random session Replay | Replay on error |
| --- | --- | --- |
| Local / preview | Off | Off |
| Production | Off (`sessionSampleRate: 0`) | On (`onErrorSampleRate: 1`) |

Configured in `instrumentation-client.ts` + helpers in `lib/sentry/options.ts`.  
**Quota tip:** a Replay counts when **captured**, not when you watch it. Free plans have a tiny Replay allowance.

**Not in Sentry:** consent-gated product/session UX recording — that is PostHog.

## PostHog — what we ship

Opt-in product analytics:

- Wired via `AnalyticsRoot` → `PostHogProvider`
- Preferences: `privacy_preferences.analytics_enabled` / `session_replay_enabled`
- Identify by **account UUID** only (plus optional `role`)
- Autocapture / default pageviews **off** — we send explicit events from `lib/analytics/events.ts`
- Session recording: masked inputs; **stopped** on `/sign-in`, `/accept-invite`, `/forgot-password`, `/reset-password`
- Sign-out resets PostHog identity

Members change toggles under **Account → Privacy & analytics**. Invite flow can set them at join time.

## Where to look in code

| Concern | Files |
| --- | --- |
| Sentry shared options / Replay rates | `lib/sentry/options.ts` |
| Sentry client init | `instrumentation-client.ts` |
| Sentry server / edge | `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` |
| Sentry Next wrapper / tunnel | `next.config.ts` |
| PostHog init + consent | `lib/analytics/posthog.ts` |
| Event names | `lib/analytics/events.ts` |
| Provider / root wiring | `components/analytics/*` |
| Privacy UI + DB prefs | `components/privacy/*`, `lib/privacy/*` |
| Legal copy | `content/pages/privacy.md` |

## 5-minute health check

1. **Sentry local:** set dev DSN → Account Sentry test button → issue in **dev** project, **no** Replay.
2. **Sentry prod:** after deploy, one controlled client error → issue in **prod** project **with** Replay; idle browsing should not create Replays.
3. **PostHog:** enable analytics in Account → trigger a page view / action → event in PostHog EU project. Decline → no events; Sentry still works.
4. **Alerts:** prod Slack/`#apic-errors` rules live only on the prod Sentry project ([sentry-alerts.md](./sentry-alerts.md)).

## Do / don’t

- Do keep EU hosts (`de.sentry.io`, `eu.i.posthog.com`).
- Do keep separate dev vs prod keys/DSNs.
- Don’t put Replay or User Feedback on server/edge Sentry configs (browser APIs only).
- Don’t turn on Sentry random session sampling (`replaysSessionSampleRate`) unless you have Replay quota to burn.
- Don’t treat PostHog as a substitute for Sentry (or the reverse).
