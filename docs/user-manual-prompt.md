# Prompt: Document user stories in the User Manual

Copy everything below the line into a new agent chat (fill in the placeholders first).

---

## Task

Create or extend verified user documentation for the following user stories from [`docs/user-stories.md`](./user-stories.md):

**Stories to document (edit this list):**

- US-XX — …
- US-XX — …

**Append to** [`docs/USER_MANUAL.md`](./USER_MANUAL.md) (do not rewrite unrelated existing sections unless labels/routes changed).  
**Screenshots go in** [`docs/screenshots/`](./screenshots/).  
**In-app preview** already exists at `/account/user-manuals` (renders the markdown + images). Keep that working: relative image paths must stay `screenshots/….png`, and new PNGs must live under `docs/screenshots/`.

---

## Requirements (per user story)

1. **Start from the correct initial state** (signed out vs signed-in member vs admin). State that clearly in the Overview.
2. **Verify the workflow in a real browser** against the running app (`http://localhost:3000` unless told otherwise). Do not invent screens, labels, or routes.
3. **Re-read current UI code** before documenting — flows change (e.g. invite onboarding grew beyond a single password page). Prefer live labels over older docs if they disagree.
4. **Record every meaningful user action** as a numbered step.
5. **Screenshot after each important action** only — no filler shots of identical idle states.
6. **Add a numbered click indicator** (red circle with the step number) on the control the user should click in that step’s screenshot.
7. **Write concise instructions** for each step: what to do + what they should see next.
8. Use **exact UI labels** from the app (button text, headings, nav items, field labels).

---

## `USER_MANUAL.md` format

Update the **Table of Contents** with clickable links to each new story heading.

For each story, use:

```markdown
## US-XX — [Story title]

### Overview
[What the workflow accomplishes, who it’s for, prerequisites.]

### Steps

#### Step 1 — [Action]
- What the user should do.
- What they should expect to see.

![Step 1](screenshots/usXX-01-short-slug.png)

#### Step 2 — [Action]
...
```

Rules:

- Image paths are **relative to `docs/`**: `screenshots/….png` (required for `/account/user-manuals`).
- Filename pattern: `usXX-NN-short-slug.png` (zero-padded story + step).
- Heading slug for TOC links: lowercase, non-alphanumeric → single `-` (same as the in-app renderer).
- If the live app differs from the story wording (e.g. a page is auth-gated), **document reality** and add a short note — do not invent public access that does not exist.

---

## Capture method (this repo)

No reliable Cursor browser MCP in all sessions. Use **Playwright** with the helpers already in the repo:

- Shared lib: [`scripts/docs-capture-lib.mjs`](../scripts/docs-capture-lib.mjs)  
  - Uses cached Chromium at the `executablePath` in that file (`--no-sandbox`).  
  - `shotWithClick()` overlays the numbered badge, then screenshots.  
  - Shell must run **outside the sandbox** (`required_permissions: ["all"]`) or Chrome gets SIGABRT.
- Prefer small per-story scripts (e.g. `scripts/docs-capture-us08.mjs`) that import the lib.
- Wait for real content (not a “Loading…” spinner) before capturing category/map/calendar pages.
- Viewport: 1280×800 unless a full-page shot is needed for a long form.

After capture, confirm every `![…](screenshots/…)` path in the markdown resolves to a file on disk.

---

## Credentials & handoffs (fill in before running)

| Need | Value |
| --- | --- |
| Base URL | `http://localhost:3000` |
| Member test account | _(email / password)_ |
| Admin test account (if needed) | _(email / password)_ |
| Inbox for OTP / invite / recovery | _(email you control)_ |

**OTP flows:** When the app emails a one-time code, **stop and ask me to paste it**. Do not request a fresh code after I paste one (that invalidates it). Do not invent codes.

**Password resets:** New password must differ from the current one.

**Destructive / state-changing demos:** Prefer disposable test users; say what you changed (password, attendance row, etc.).

---

## Process checklist

1. Confirm `npm run dev` is up; skim story text in `docs/user-stories.md`.
2. Trace routes/components in code; note exact labels and step order.
3. Capture screenshots end-to-end in the browser (with click badges).
4. Append/update `docs/USER_MANUAL.md`; refresh TOC.
5. Open `/account/user-manuals` while signed in and spot-check that new sections and images render.
6. Final pass: instructions match the current app; no broken image paths; no invented UI.

---

## Out of scope unless asked

- Rewriting developer docs or architecture specs  
- Changing product behavior to match outdated story text (document as-is; optionally note a product gap)  
- Committing or opening a PR unless I ask  

---

## Example story batch (members hub)

If documenting the next batch, a typical set is:

- US-05 — Enter the members area  
- US-06 — Manage my profile  
- US-07 — Change my password while signed in  

Replace the story list at the top with whichever IDs you want this run.
