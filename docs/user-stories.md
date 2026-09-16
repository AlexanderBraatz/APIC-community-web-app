# APIC Community — Main User Stories

**Product:** Private holiday-community platform for APIC property owners in Castelfalfi.  
**Not in scope (v1):** public self-registration, messaging/chat, bookings/payments, member-authored listings, full attendance history archive.

Derived from [`developer/architecture-spec.md`](./developer/architecture-spec.md) and member-facing content.

---

## Personas

| Persona | Who |
| --- | --- |
| **Visitor** | Anyone on the public marketing site (not signed in) |
| **Member** | Invited APIC owner with role `user` |
| **Admin** | Community administrator with role `admin` |
| **CMS editor** | Staff editing marketing pages in Tina (orthogonal to app roles) |

---

## Public site

### US-01 — Learn about APIC
As a **visitor**, I want to browse the marketing site (home, about, events, category pages) so that I understand what APIC is and how to get in touch.

### US-02 — Sign in (no public signup)
As a **member or admin**, I want to sign in with email and password so that I can access the private members area.

### US-03 — Accept an invitation
As an **invited owner**, I want to open my invite link, set a password, and create my account so that I can join the community without public registration.

### US-04 — Reset a forgotten password
As a **member or admin**, I want to request a password reset by email and set a new password so that I can regain access if I forget my credentials.

---

## Members hub & account

### US-05 — Enter the members area
As a **signed-in member**, I want a members hub (`/place`) that links me to the attendance calendar and local category pages so that I can navigate the private community space.

### US-06 — Manage my profile
As a **signed-in member**, I want to update my display name and avatar so that other members recognize me on the attendance calendar.

### US-07 — Change my password while signed in
As a **signed-in member**, I want to change my password from my account page so that I can keep my account secure.

---

## Attendance calendar (“who is here”)

### US-08 — See who is in Castelfalfi
As a **signed-in member**, I want to view current and upcoming attendance stays for other members on the community calendar so that I know who will be around when I am there.

### US-09 — Add my own stays
As a **signed-in member**, I want to create attendance stays (arrival/departure dates, title, optional note), including overlapping stays, so that others can see when I will be present.

### US-10 — Edit or remove my stays
As a **signed-in member**, I want to edit or soft-delete my own stays and then save or discard a draft batch so that I can keep my attendance accurate without accidental publishes.

### US-11 — Find and compare members on the calendar
As a **signed-in member**, I want to search for people and pin/compare selected members on the scheduler so that I can focus on the people I care about.

### US-12 — Inspect another member’s stay (read-only)
As a **signed-in member**, I want to open another member’s stay in a read-only view so that I can see their dates and note without changing their data.

### US-13 — Manage another member’s attendance (admin)
As an **admin**, I want to create, edit, and delete any member’s attendance (including via member search in manage-availability) so that I can correct the calendar on behalf of the community.

---

## Local listings & map

### US-14 — Browse trusted local places
As a **signed-in member**, I want to browse curated listings by category (Food & Dining, Services & Maintenance, Health & Wellness, Shop & Market) so that I can find useful places around Castelfalfi and Tuscany.

### US-15 — Search and filter listings
As a **signed-in member**, I want to search by name, type, and tags and filter with tag chips so that I can quickly narrow down recommendations.

### US-16 — See listings on a map
As a **signed-in member**, I want to view listing pins on a map centered on Castelfalfi, select a place to focus it, and see contact/remark details so that I can plan visits locally.

---

## App administration

### US-17 — Invite a new member
As an **admin**, I want to invite someone by email so that only approved owners can join the platform.

### US-18 — Manage invitations
As an **admin**, I want to view pending and historical invitations and resend or cancel them so that onboarding stays under control.

### US-19 — Manage users and roles
As an **admin**, I want to list members (including emails), promote/demote roles, and delete users—without removing the last admin—so that community access stays correct and safe.

### US-20 — Manage listings and tags
As an **admin**, I want to create, edit, and delete listings and tags, including setting address/coordinates via geocode or map placement, so that the local directory stays accurate.

### US-21 — Review admin audit activity
As an **admin**, I want to read an audit log of sensitive actions (invites, role changes, user deletes, listing changes, admin attendance edits) so that I can see what changed and by whom.

### US-22 — Use an admin dashboard
As an **admin**, I want a simple app-admin home with counts and shortcuts so that I can jump to users, invitations, listings, and the audit log.

---

## Marketing content (CMS)

### US-23 — Edit public marketing pages
As a **CMS editor**, I want to edit marketing pages and blocks in Tina (`/admin`) so that public site content can change without touching the members app backend.

---

## Explicit non-goals (v1)

These are **not** main user stories for v1:

- Public self-registration
- In-app messaging or chat
- Booking units, payments, or rental inventory
- Members creating their own listings
- A dedicated past-attendance history archive for members
