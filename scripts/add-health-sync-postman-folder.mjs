#!/usr/bin/env node
/**
 * One-off helper: append Health Sync folder to Postman collection export.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const collectionPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);

const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));

if (collection.item.some((f) => f.name === 'Health Sync')) {
  console.log('Health Sync folder already present — skip');
  process.exit(0);
}

const bearerHeader = [{ key: 'Accept', value: 'application/json' }];

function req(name, method, pathSegments, description, body, examples = []) {
  const item = {
    name,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status ok", function () {',
            '  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
            '});',
          ],
        },
      },
    ],
    request: {
      method,
      header: bearerHeader,
      url: {
        raw: `{{baseUrl}}/${pathSegments.join('/')}`,
        host: ['{{baseUrl}}'],
        path: pathSegments,
      },
      description,
    },
    response: examples,
  };
  if (body !== null) {
    item.request.header.push({ key: 'Content-Type', value: 'application/json' });
    item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2) };
  }
  return item;
}

const folder = {
  name: 'Health Sync',
  description:
    'Client-owned wearable connect/disconnect, metrics ingest, staff WEARABLES grant read (3.3). Guide: gym-backend `docs/health-sync.md`.',
  item: [
    req(
      'List My Wearable Connections',
      'GET',
      ['me', 'wearable-connections'],
      '**Story:** A client sees which health apps are connected and when they last synced.\n\nGET /me/wearable-connections — CLIENT lane only.\n\n**200:** `{ connections: WearableConnection[] }`',
    ),
    req(
      'Connect Wearable',
      'POST',
      ['me', 'wearable-connections'],
      '**Story:** A client links Health Connect (or Apple Health / Samsung Health) before pushing daily metrics.\n\nPOST /me/wearable-connections\n\n**Body:**\n- `provider` (enum): `APPLE_HEALTH` | `HEALTH_CONNECT` | `SAMSUNG_HEALTH`\n- `authRef` (object|null, optional) — prefer null for device push\n\n**201:** `{ connection }` · **409** duplicate live connection',
      { provider: 'HEALTH_CONNECT', authRef: null },
      [
        {
          name: '201 Created',
          originalRequest: {
            method: 'POST',
            header: bearerHeader,
            body: { mode: 'raw', raw: '{"provider":"HEALTH_CONNECT"}' },
            url: {
              raw: '{{baseUrl}}/me/wearable-connections',
              host: ['{{baseUrl}}'],
              path: ['me', 'wearable-connections'],
            },
          },
          status: 'Created',
          code: 201,
          _postman_previewlanguage: 'json',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          cookie: [],
          body: JSON.stringify({
            connection: {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              provider: 'HEALTH_CONNECT',
              lastSyncedAt: null,
              active: true,
              createdAt: '2026-08-18T04:00:00.000Z',
            },
          }),
        },
      ],
    ),
    req(
      'Sync Wearable Metrics',
      'POST',
      ['me', 'wearable-metrics', 'sync'],
      '**Story:** The mobile app pushes normalized daily metrics after reading Health Connect locally.\n\nPOST /me/wearable-metrics/sync — requires live connection.\n\n**Body:**\n- `provider` (enum)\n- `days[]` — each day needs at least one metric field\n\n**200:** `{ syncedDays, lastSyncedAt }`',
      {
        provider: 'HEALTH_CONNECT',
        days: [
          {
            metricOn: '2026-08-18',
            steps: 8420,
            activeKcal: 410.5,
            workoutMinutes: 45,
            weightKg: 72.3,
          },
        ],
      },
    ),
    req(
      'List My Wearable Metrics',
      'GET',
      ['me', 'wearable-metrics'],
      '**Story:** A client reviews synced steps, calories, and weight history.\n\nGET /me/wearable-metrics?provider=&from=&to=&limit=&offset=\n\n**200:** `{ wearableMetrics: Page }`',
    ),
    req(
      'Disconnect Wearable',
      'DELETE',
      ['me', 'wearable-connections', 'HEALTH_CONNECT'],
      '**Story:** A client disconnects a provider; historical metrics remain until erasure.\n\nDELETE /me/wearable-connections/:provider\n\n**200:** `{ connection }` with `active: false`',
    ),
    req(
      'List Client Wearable Metrics (Staff)',
      'GET',
      ['gym-orgs', '{{gymOrgId}}', 'clients', '{{clientUserId}}', 'wearable-metrics'],
      "**Story:** A trainer with WEARABLES grant reviews a member's synced metrics.\n\nGET /gym-orgs/:gymOrgId/clients/:clientUserId/wearable-metrics\n\n**403** `HEALTH_SYNC_FORBIDDEN` without WEARABLES grant",
      null,
      [
        {
          name: '403 Forbidden — no WEARABLES grant',
          originalRequest: {
            method: 'GET',
            header: bearerHeader,
            url: {
              raw: '{{baseUrl}}/gym-orgs/{{gymOrgId}}/clients/{{clientUserId}}/wearable-metrics',
              host: ['{{baseUrl}}'],
              path: ['gym-orgs', '{{gymOrgId}}', 'clients', '{{clientUserId}}', 'wearable-metrics'],
            },
          },
          status: 'Forbidden',
          code: 403,
          _postman_previewlanguage: 'json',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          cookie: [],
          body: JSON.stringify({
            error: {
              code: 'HEALTH_SYNC_FORBIDDEN',
              message: 'WEARABLES grant required to view client wearable metrics',
            },
          }),
        },
      ],
    ),
  ],
};

collection.item.push(folder);
writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
console.log('Added Health Sync folder with', folder.item.length, 'requests');
