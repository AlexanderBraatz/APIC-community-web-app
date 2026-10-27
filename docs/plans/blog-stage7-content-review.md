# Stage 7 — Golf post content review

Source: `content/blog/1.md`  
Migrated to Supabase `blog_posts` with TipTap body.

| | |
| --- | --- |
| **Post id** | `edf6d818-f423-44b7-8d37-3cb36531d69a` |
| **Slug** | `castelfalfi-owners-friends-golf-tournament` |
| **Public URL** | `/blog/castelfalfi-owners-friends-golf-tournament` |
| **Admin edit** | `/members/admin/blog/edf6d818-f423-44b7-8d37-3cb36531d69a` |

## Frontmatter → `blog_posts`

| Field | Value |
| --- | --- |
| title | Castelfalfi Owners & Friends Golf Tournament |
| author | APIC |
| published_at | 2026-07-11T12:00:00.000Z |
| short_description | Around 40 participants joined our friendly nine-hole competition at Bellosguardo Golf Club — a memorable day of golf, friendship, and community. |
| status | published |
| slug | `castelfalfi-owners-friends-golf-tournament` (slugify of title) |
| thumbnail_path | First gallery image after upload (`…/body/5bf74eca-ca57-48b6-883e-3955223a2e62-1.jpeg`) |

## Body blocks (Tina → TipTap)

| # | Tina block | Decision | TipTap result |
| --- | --- | --- | --- |
| 1 | `richText` (3 paragraphs) | **Kept** | Three TipTap `paragraph` nodes |
| 2 | `divider` (`style: star`) | **Dropped** | No TipTap equivalent; star separator omitted |
| 3 | `imageGallery` (6 images) | **Transformed** | Six sequential TipTap `image` nodes; files uploaded to `blog-images/{uuid}/body/…` |
| 4 | `cta` | **Transformed** | Plain paragraphs: title **“Get in Touch”** (cleaned from “Get in Touch hello”), description text, then linked “Email APIC” → `mailto:info.apic@aol.com` |
| 5 | `map` | **Not in body** | Article shell renders map via `blog_map_locations` remapped to the new post UUID |

## Cleanup notes for you to confirm

1. **Star divider removed** — if you want a visual break between intro and photos, add a short paragraph or heading in the stepper body editor.
2. **CTA title cleaned** — “Get in Touch hello” → “Get in Touch”. Restore the original wording in the editor if preferred.
3. **CTA is no longer a button block** — it is text + a mailto link (same destination as before).

## Redirects / map

- `blog_slug_redirects`: old slug `1` → new post id (so `/blog/1` resolves).
- `next.config.ts`: removed title-slug → `/blog/1` (title slug is canonical).
- Map row for Tina post `1` remapped to `edf6d818-f423-44b7-8d37-3cb36531d69a`.
- Schema: `blog_map_locations.post_id` is now `uuid` FK → `blog_posts(id)` ON DELETE CASCADE.
- Orphan Tina numeric map pins (`2`, `3`, `5`, `6`, `11`, `18`, `23`) deleted (no corresponding posts).
- Public SELECT on maps tightened to published posts only; admins can still select all.

## How this was applied

- Script: `npm run migrate:golf-blog` → `scripts/migrate-golf-blog-post.mjs`
- Migration: `supabase/migrations/20261027140000_blog_map_locations_uuid_fk.sql` (applied remotely)
