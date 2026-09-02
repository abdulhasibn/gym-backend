# Workout streak (compute-on-read)

**Status:** accepted

Clients (and staff with a live `WORKOUT_PLANS` grant) can read a **current** and **longest** workout streak for a client at an assigning gym. Streaks are **computed on read** from the date-based schedule (ADR-0010) and schedule completions (ADR-0011). No streak table, no notifications.

Diet stays unchanged.

## Why

Phase 3 exposes `dayDone` per calendar day but not a streak summary. Product rules require REST days to preserve a streak and TRAINING days to count only when fully completed.

## Rules

- **Lookback:** 366 gym-local calendar days ending at `asOf` (today).
- **Metrics:** `currentStreak`, `longestStreak`, `asOf`, `lookbackDays: 366`.
- **REST:** preserves the run (does not increment the count).
- **TRAINING + dayDone:** increments by 1 and continues.
- **TRAINING not dayDone** or **no schedule row** for that calendar day: breaks the run.
- **Open today:** if `asOf` is TRAINING and not `dayDone`, skip `asOf` when computing **current** streak (day still completable in the `[D, D+2]` window). Include `asOf` when it is REST or TRAINING `dayDone`.
- **Longest:** same day classification over the full lookback (all contiguous runs).
- **Staff:** assigned Trainer / Admin-as-Trainer **and** live `WORKOUT_PLANS`; otherwise 403.
- **Client:** self + active membership; empty / zero streaks when no membership.

`dayDone` semantics match ADR-0011 (REST vacuous true; TRAINING = all session exercises completed with `completed_on = D`).

## Ownership / modules

`coaching` owns the pure streak helper and read use cases. Schedule + completion **query** ports only (no command repos).

## Considered options

- **Persist counters** — rejected: schedule overwrite and catch-up completions would desync; compute-on-read is enough for MVP.
- **Unscheduled days preserve like REST** — rejected: only explicit REST preserves.
- **Embed on schedule GET** — rejected: 366-day scan should not couple to calendar range reads.
