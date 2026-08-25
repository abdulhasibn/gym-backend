# E2E flow reports

After `pnpm test:e2e`, this folder contains:

| File | Purpose |
|------|---------|
| [`latest.md`](./latest.md) | Human-readable flow report (expected vs actual behaviour) |
| [`latest.json`](./latest.json) | Machine-readable twin |
| `report-*.md` | Timestamped copies of the same run |

Open `latest.md` to see every Flow ID, whether it passed, and how the app behaved.
