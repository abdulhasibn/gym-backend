# Attendance as a visit (check-in + check-out)

**Status:** accepted

An `Attendance` row is one **visit**: check-in opens it, check-out closes it. Duration is computed on read. At most one open visit per client per gym. Historical check-in-only pings are backfilled as zero-duration closed visits.

## Why

2.1 stored a single `occurred_at` ping. Multiple same-day check-ins were allowed and there was no session, so duration and “who is on the floor” could not exist. Product now needs check-out, visit length, and an Admin currently-in-gym list.

## Rules

- **Visit:** one row. `occurred_at` remains the check-in instant. `checked_out_at` + `checkout_recorder_user_id` are both null (open) or both set (closed).
- **One open visit:** partial unique `(gym_org_id, client_user_id) WHERE deleted_at IS NULL AND checked_out_at IS NULL`. Second check-in while open → `ALREADY_CHECKED_IN`. After check-out, another visit the same day is allowed.
- **Duration:** not stored. Closed: floor seconds between check-in and check-out. Open history: `null`. Present list: elapsed seconds from check-in to now.
- **Check-out gate:** CLIENT self or Admin desk. Not gated by ACTIVE / `check_in_blocked` / in-date BASE. Trainer remains view-only. BASE first-start stays on check-in only.
- **Offboard:** does not auto-close an open visit.
- **Backfill:** existing rows close at `occurred_at` with `checkout_recorder_user_id = recorder_user_id` so they do not appear as present.

## Ownership / modules

`attendance` owns the entity transition, command-repo `findOpenByClient`, check-out use cases, and the present query. No new feature module.

## Considered options

- **Event log (separate check-out rows)** — rejected: duration and “open now” become pairing queries; the unique open-visit rule is harder to enforce.
- **Auto-close previous on new check-in** — rejected: silent durations hide forgotten check-outs; product chose 409 instead.
- **Persist duration** — rejected: derived; would desync if timestamps change.
- **Auto-close at gym-local midnight** — deferred: needs a scheduled job (overlaps 3.5).
