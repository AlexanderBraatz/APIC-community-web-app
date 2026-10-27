---
name: Blog Editor Stepper
overview: Replace Tina blog authoring with Supabase + a 4-step admin stepper, delivered as sequential commitable stages you can verify and tweak before the next stage starts.
todos:
  - id: stage-1-schema
    content: "Stage 1: blog_posts, slug redirects, blog-images bucket + RLS + next/image remotePatterns (map UUID cutover deferred to Stage 7)"
    status: completed
  - id: stage-2-read-api
    content: "Stage 2: read helpers + rewrite public /blog and /blog/[slug] from Supabase (empty/seed-safe); keep Tina write path temporarily"
    status: completed
  - id: stage-3-crud
    content: "Stage 3: server actions for draft/publish/unpublish/soft-delete, slug sync, image upload"
    status: pending
  - id: stage-4-header-location
    content: "Stage 4: BlogFormStepper steps 1–2 (header + location) with draft create/autosave; admin create/edit routes"
    status: pending
  - id: stage-5-tiptap-preview
    content: "Stage 5: TipTap body step + preview/publish step; next/image body rendering"
    status: pending
  - id: stage-6-admin-chrome
    content: "Stage 6: dashboard/overview/post admin actions (add/edit/delete/turn-to-draft) + confirm modal + draft badges"
    status: pending
  - id: stage-7-migrate-cutover
    content: "Stage 7: migrate golf post (your content review) then remove Tina blog entirely"
    status: pending
isProject: false
---

# Blog Editor – Staged Delivery

Work proceeds **one stage at a time**. Each stage ends in a **commit-sized slice** you can run, review, and tweak before approving the next stage. Do not start stage N+1 until you sign off on stage N.

## Decisions locked (all stages)

- Blog leaves Tina (final cutover in Stage 7 only).
- Supabase `blog_posts` + `blog-images` bucket; map keyed by stable UUID `id`.
- Slug **stays in sync with title**; storage/map **never** use slug.
- Stepper: Header → Location → Body → Preview/Publish.
- Draft after Step 1 valid; Save draft + autosave; drafts on `/blog` for admins only.
- Soft delete hidden from public **and** admin UI; **Turn back into Draft** supported.
- Featured image optional + placeholder; no storage cleanup.
- Edit opens on body step (once body exists in Stage 5).

## Slug vs storage

```text
title ──slugify──► slug     (URL only; updates with title)
id (UUID) ──────► blog-images/{id}/...  and  blog_map_locations.post_id
```

Old slugs kept in `blog_slug_redirects` when the title/slug changes.

---

## Stage 1 — Schema & storage foundation

**Goal:** Database and bucket exist; nothing user-facing changes yet.

**Ship:**
- Migration: `blog_posts` (`id`, `slug`, title/author/published_at/short_description, `thumbnail_path`, `body` jsonb, `status` draft|published|deleted, audit cols, `deleted_at`)
- Migration: `blog_slug_redirects`
- **Defer** converting `blog_map_locations.post_id` to uuid FK until Stage 7 (existing Tina post `1` map must keep working). Stage 1 only creates `blog_posts` + redirects + storage.
- Storage bucket `blog-images` + RLS (public read, admin write)
- `next.config` remotePatterns for Supabase storage host
- Regenerate/update `database.types.ts`

**Verify:**
- Migration applies cleanly on local Supabase
- Advisors/RLS look correct
- Can upload a test object to `blog-images` as admin (SQL/storage smoke), public URL loads

**Commit:** `feat(blog): add posts schema, slug redirects, and blog-images bucket`

**Stop for your review** before Stage 2.

---

## Stage 2 — Public read path (Supabase-backed pages)

**Goal:** `/blog` and `/blog/[slug]` read from Supabase; Tina still owns create/edit so the site doesn’t go empty mid-project.

**Ship:**
- `lib/blog/` query helpers (list published; admin also drafts; by slug + redirect lookup)
- Rewrite [`app/blog/page.tsx`](app/blog/page.tsx) and [`app/blog/[slug]/page.tsx`](app/blog/[slug]/page.tsx) to use helpers
- Fixed article shell components ready for later: header, optional map-by-post-id, body slot (body can render empty/placeholder TipTap JSON for now)
- Placeholder thumbnail component when `thumbnail_path` is null
- If no rows yet: empty state on index (acceptable until Stage 7); optionally insert one manual SQL seed for layout check

**Verify:**
- Index/detail render against DB (empty or seeded)
- Non-admin never sees drafts
- Admin can see a manually inserted draft (SQL) with a clear draft treatment (badge can be rough; polish in Stage 6)
- Slug redirect table works if you insert a test redirect row

**Commit:** `feat(blog): serve blog index and posts from Supabase`

**Stop for your review** before Stage 3.

---

## Stage 3 — Write API (no full UI yet)

**Goal:** All mutations exist and are testable (server actions / thin admin smoke UI optional).

**Ship:**
- `requireAdmin` actions: createDraft (from valid header fields), updateDraft (autosave payload), publish, turnBackToDraft, softDelete
- Slugify helper: sync slug from title on save; on change write `blog_slug_redirects`
- Image upload action: thumbnail + body image → `blog-images/{id}/...`, return public URL/path
- Map upsert/delete already exist — retarget to uuid `post_id` once Stage 1/7 alignment allows; until golf post migrated, keep compatibility notes in code

**Verify:**
- Call actions from a temporary script, React smoke page, or Playwright-less manual invocation
- Draft → publish → turn back to draft → soft delete status transitions
- Soft-deleted post disappears from Stage 2 queries for admin and public
- Title change updates slug + creates redirect; storage paths unchanged

**Commit:** `feat(blog): add draft, publish, and image upload server actions`

**Stop for your review** before Stage 4.

---

## Stage 4 — Stepper: Header + Location

**Goal:** Create/edit flow for metadata and map without TipTap yet.

**Ship:**
- `BlogFormStepper` + `StepperNav` reuse
- Step 1 Header: title, author (default profile), date (default now), intro, optional thumbnail upload; display-size-ish typography
- Step 2 Location: reuse `GoogleStep` / `LocationStep`; skip allowed; save against post `id`
- After Step 1 valid: create draft + debounced autosave + explicit Save draft
- Routes: `/members/admin/blog/new`, `/members/admin/blog/[id]`
- Wire dashboard “Add Blog article” to the new route (leave Tina “Blog admin” link until Stage 7)

**Verify:**
- Create article through steps 1–2, abandon, find draft via DB or Stage 2 admin list
- Edit existing draft from `/members/admin/blog/[id]`
- Location appears on public detail only when published + location row exists (publish via Stage 3 action or temporary button)

**Commit:** `feat(blog): add header and location stepper steps`

**Stop for your review** before Stage 5.

---

## Stage 5 — TipTap body + Preview / Publish

**Goal:** Full authoring loop inside the stepper.

**Ship:**
- TipTap editor (p, h2, h3, bold, italic, link, lists, images) with constrained toolbar
- Body image upload via Stage 3 action; store URLs in TipTap JSON
- TipTap → React renderer using `next/image` for the public/preview article
- Step 4 Preview: real header + map + body; **Save draft** + **Publish**
- Edit mode starts on **body** step

**Verify:**
- Write Text → Image → Text; publish; public page matches preview closely
- Formatting limited (no color/font controls)
- Autosave keeps body while navigating steps

**Commit:** `feat(blog): add TipTap body editor and publish preview step`

**Stop for your review** before Stage 6.

---

## Stage 6 — Admin chrome on blog surfaces

**Goal:** Non-technical entry points match the product spec.

**Ship:**
- `/blog` admin: Add article button; draft badges; Edit / Delete on cards
- Post detail admin: Edit, Delete (confirm modal), Turn back into Draft
- Dashboard quick action points at new flow; blog post count from Supabase
- Delete confirmation modal; success/redirect patterns consistent with listings

**Verify:**
- As admin: full path from dashboard → create → publish → edit → draft → soft delete
- As non-admin: no draft rows, no admin buttons
- Soft-deleted never listed

**Commit:** `feat(blog): add admin actions on dashboard and blog pages`

**Stop for your review** before Stage 7.

---

## Stage 7 — Content migration + Tina blog removal

**Goal:** One production post on the new system; Tina no longer touches blog.

**Ship:**
1. Migration script/notes for [`content/blog/1.md`](content/blog/1.md): frontmatter → `blog_posts`, images → bucket, rich text → TipTap, gallery → sequential images, remap `blog_map_locations` to new uuid
2. **Pause for you:** review proposed body; decide fate of divider + CTA (drop vs plain link/text)
3. Apply agreed content
4. Remove Tina `blog` collection, blog field components, `/api/blog/next-id`, `content/blog/*`, admin “Blog admin” Tina links
5. Redirect old `/blog/1` → new title slug (via redirect table or next.config)

**Verify:**
- Golf article looks correct on `/blog` and slug URL
- `/blog/1` redirects
- Tina admin has no blog collection; pages CMS still works
- Map still works on the migrated post

**Commit(s):**
- `chore(blog): migrate golf tournament post to Supabase` (after your content sign-off)
- `chore(blog): remove Tina blog collection and legacy content`

**Done.**

---

## Out of scope (all stages)

- UI restore for soft-deleted posts
- Storage garbage collection
- Reintroducing gallery/CTA/embed/pull-quote blocks
- Non-blog Tina pages

## How we’ll work

1. Implement only the current stage.
2. You verify using that stage’s checklist (tweak as needed).
3. Commit that stage when you’re happy.
4. Explicitly say to start the next stage.
