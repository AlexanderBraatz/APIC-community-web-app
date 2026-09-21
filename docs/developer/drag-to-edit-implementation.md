# Archive: calendar drag-to-edit (removed)

This document describes the **client draft + drag-to-edit** attendance UX that was removed so create/edit/delete go only through **Manage attendance** (immediate `saveAttendanceBatch`). Use it if you want to bring drag-edit back.

Current product path: click an event bar or **Manage attendance** → modal form → save/delete immediately → centered “Changes saved” overlay. No status chips, no floating confirm bar.

---

## What it did

Members (on wide viewports) and admins could:

1. **Drag-move** and **drag-resize** editable event bars on the DayPilot scheduler.
2. **Drag-select** a time range on an editable row to create a draft stay.
3. **Soft-delete** via an × on the bar (`tags.markedForDeletion`), committed only on Save.
4. See **status chips** on bars: `ready` (“Drag to edit”), `unsaved`, `saved`, or “To delete”.
5. Confirm with a **fixed bottom-right** “Keep your updates?” panel (Discard / Save).
6. Get **leave guards** (`beforeunload` + `popstate`) while drafts were unsaved.

Narrow viewports (≤640px via `useIsNarrowScreen`) disabled move/resize/time-range create and hid the ready chip and ×. Permission gate was `canEditResource` (`isAdmin || resourceId === currentUserId`). There was **no** separate touch-vs-mouse check.

---

## Core mental model

```
DayPilot drag / resize / time-range / ×
        │
        ▼
  draftEvents (null = show dbEvents)
        │  tags.saveStatus = 'unsaved'
        │  tags.markedForDeletion (soft-delete)
        ▼
  hasUnsavedChanges → bottom-right Save/Discard
        │
        ▼
  saveChanges → saveAttendanceBatch({ stays, deleteIds })
        │
        ▼
  setDbEvents + tag recently saved ids as 'saved' (chip)
```

Manage attendance already wrote into the same draft buffer, then called `saveChanges` immediately (so modal saves also produced the green “Saved” chip).

---

## Key symbols (were in `app/components/scheduler.tsx`)

| Symbol | Role |
| --- | --- |
| `draftEvents` / `setEventRows` / `eventRows` | Client draft overlay over `dbEvents` |
| `EditStatus` / `EVENT_STATUS_LABELS` | `'ready' \| 'unsaved' \| 'saved'` + chip labels |
| `withEventSaveStatus` / `withMarkedForDeletion` | Tag helpers |
| `getEventSaveStatus` / `isMarkedForDeletion` | Tag readers |
| `stripDraftTags` | Reset tags to ready (defined; often unused) |
| `persistEventChange` | Apply start/end/resource + `unsaved` |
| `onEventMove` / `onEventMoved` | Gate + apply move |
| `onEventResize` / `onEventResized` | Gate + apply resize |
| `onTimeRangeSelect` / `onTimeRangeSelected` | Gate + create draft stay |
| `deleteEvent` | Toggle `markedForDeletion` |
| `hasUnsavedChanges` | Drive confirm bar + leave guard |
| `saveChanges` | Diff draft vs DB → `saveAttendanceBatch`; set `'saved'` chips |
| `discardChanges` | `setDraftEvents(null)` |
| Leave dialog + `unsavedHistoryPushedRef` / `allowLeaveRef` | Back-button / unload protection |
| Config | `eventMoveHandling` / `eventResizeHandling` / `timeRangeSelectedHandling` toggled by `isNarrow` |

CSS (were in `app/styles/selection-separator.css`): `.edit-status-chip-*`, `.scheduler-event-unsaved`, `.scheduler-event-marked-delete`, `.scheduler-event-delete-mark`.

Adapters previously stamped `tags.saveStatus: 'ready'` in `attendanceToEvent`.

---

## Persist contract (unchanged)

- Server: `saveAttendanceBatch` → RPC `save_attendance_batch` (`p_stays`, `p_delete_ids`).
- Soft-delete was **client-only** until Save: marked bars stayed in the draft; `deleteIds` sent on commit.
- Inclusive DB dates vs exclusive DayPilot ends: still handled by `lib/attendance/adapters.ts`.

---

## How to restore (high level)

1. Reintroduce draft state (`draftEvents`), status tags, and chip/unsaved CSS from this doc / git history.
2. Re-enable DayPilot move/resize/time-range handling (optionally gated by viewport again).
3. Restore soft-delete × **or** keep modal Delete (immediate) and only restore drag create/edit.
4. Restore floating Save/Discard + leave guards if drafts can exist without an immediate save.
5. Update [`architecture-spec.md`](./architecture-spec.md) §8.1 / §8.4 and user-facing copy if drag instructions return.

Prefer restoring from git history of `scheduler.tsx` + `selection-separator.css` rather than rebuilding from scratch.

---

## Related docs

- [`architecture-spec.md`](./architecture-spec.md) §8 — current form-only attendance UI
- [`../user-stories.md`](../user-stories.md) US-08–US-13 — attendance stories
