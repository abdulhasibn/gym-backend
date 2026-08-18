# Health sync (3.3)

Client-owned wearable connections and daily metrics ingest (device-push). Mobile reads Apple Health / Health Connect / Samsung Health locally and POSTs normalized payloads — no server OAuth.

**Base URL:** `https://gym-backend-lovat-mu.vercel.app` (prod) or `http://localhost:3000` (local)  
**API index:** [`api.md`](api.md)  
**Product flows:** [`product-flows.md`](product-flows.md) M10 · PRD C12

Auth: `Authorization: Bearer <accessToken>`. Errors: `{ "error": { "code", "message" } }`.

Providers: `APPLE_HEALTH` · `HEALTH_CONNECT` · `SAMSUNG_HEALTH`

---

## Client connections

### List connections

`GET /me/wearable-connections`

**200:** `{ "connections": [ { id, provider, lastSyncedAt, active, createdAt } ] }`

### Connect

`POST /me/wearable-connections`

```json
{ "provider": "HEALTH_CONNECT", "authRef": null }
```

`authRef` optional — prefer empty for HealthKit / Health Connect (device push).

**201:** `{ "connection": … }` · **409** `UNIQUE_VIOLATION` if a live connection exists for that provider

### Disconnect

`DELETE /me/wearable-connections/:provider`

Soft-disconnect (`active=false`, `deleted_at` set). Historical metrics remain on the User.

**200:** `{ "connection": … }` · **404** if no live connection

---

## Client metrics sync

### Batch sync

`POST /me/wearable-metrics/sync`

Requires a live connection for `provider`. Idempotent on `(client, provider, metric_on)`.

```json
{
  "provider": "HEALTH_CONNECT",
  "days": [
    {
      "metricOn": "2026-08-18",
      "steps": 8420,
      "activeKcal": 410.5,
      "workoutMinutes": 45,
      "weightKg": 72.3
    }
  ]
}
```

Each day must include at least one of: `steps`, `activeKcal`, `workoutMinutes`, `weightKg`.

When `weightKg` is present, the API also upserts **ProgressLog** for that date and refreshes profile current weight (same as manual progress entry).

**200:** `{ "syncedDays": number, "lastSyncedAt": string }` · **404** no live connection

### List my metrics

`GET /me/wearable-metrics?provider=&from=&to=&limit=&offset=`

**200:** `{ "wearableMetrics": { items, total, limit, offset } }`

**`items[]` fields:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | uuid | Metric row id |
| `provider` | enum | `APPLE_HEALTH` \| `HEALTH_CONNECT` \| `SAMSUNG_HEALTH` |
| `metricOn` | date | `YYYY-MM-DD` |
| `steps` | int \| null | Step count |
| `activeKcal` | number \| null | Active energy (kcal) |
| `workoutMinutes` | int \| null | Workout duration |
| `weightKg` | number \| null | Body weight when synced |
| `ingestedAt` | string | ISO timestamp of last ingest |

---

## Staff read (WEARABLES grant)

`GET /gym-orgs/:gymOrgId/clients/:clientUserId/wearable-metrics?provider=&from=&to=&limit=&offset=`

Live Admin or Trainer at the gym **and** live `WEARABLES` class grant for that client.

**403** `HEALTH_SYNC_FORBIDDEN` without grant or wrong lane.

Weight trend as progress history is separately gated by `PROGRESS` on `/progress-logs`.

---

## Flows

**F10.1 Connect** — OS permission → `POST /me/wearable-connections` → initial sync.  
**F10.2 Sync** — `POST /me/wearable-metrics/sync`; weight → ProgressLog + profile.  
**F10.3 Disconnect** — `DELETE /me/wearable-connections/:provider`.  
**F10.4 Staff** — grant-gated list at client path above.
