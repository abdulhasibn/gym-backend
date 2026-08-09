#!/usr/bin/env node
/**
 * Add Subscriptions top-level folder to gym-backend-postman export.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const collectionPath = resolve(
  __dir,
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);
const readmePath = resolve(__dir, '../../../../../gym-backend-postman/README.md');

if (!existsSync(collectionPath)) {
  console.error('Collection not found', collectionPath);
  process.exit(1);
}

const c = JSON.parse(readFileSync(collectionPath, 'utf8'));
const HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
];
const ACCEPT_ONLY = [{ key: 'Accept', value: 'application/json' }];

function url(raw, parts) {
  return { raw, host: ['{{baseUrl}}'], path: parts };
}

function example(name, code, status, bodyObj, method, urlObj, body) {
  const orig = {
    method,
    header: body !== undefined ? HEADERS : ACCEPT_ONLY,
    url: urlObj,
  };
  if (body !== undefined) {
    orig.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  return {
    name,
    originalRequest: orig,
    status,
    code,
    _postman_previewlanguage: 'json',
    header: code === 204 ? [] : [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body: code === 204 ? '' : JSON.stringify(bodyObj, null, 2),
  };
}

const err = (code, message) => ({ error: { code, message } });

const sub = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  clientMembershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  gymOrgId: '33333333-3333-4333-8333-333333333333',
  planId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  kind: 'BASE',
  capability: null,
  priceAmount: 999,
  durationDays: 30,
  startDate: null,
  endDate: null,
  startSource: null,
  paymentStatus: 'unpaid',
  amountPaid: 0,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
};

const folder = {
  name: 'Subscriptions',
  description:
    'Admin payment/start override + Client my-subscriptions (Stint 1.5 core). Guide: gym-backend `docs/subscriptions.md`.',
  item: [],
};

const u1 = url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/clients/{{clientUserId}}/subscriptions', [
  'gym-orgs',
  '{{gymOrgId}}',
  'clients',
  '{{clientUserId}}',
  'subscriptions',
]);
folder.item.push({
  name: 'List Client Subscriptions',
  request: {
    method: 'GET',
    header: ACCEPT_ONLY,
    url: u1,
    description: `GET /gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions — Admin list for a client's ACTIVE membership lines.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym. Example: \`{{gymOrgId}}\`.
- \`clientUserId\` (uuid) — Client user id. Example: \`{{clientUserId}}\`.

**Success \`200\`:** \`{ subscriptions: [ subscription, ... ] }\`

**\`subscription\` fields:**
- \`id\` (uuid) — Subscription line id → store as \`subscriptionId\`.
- \`clientMembershipId\` (uuid) — Owning membership.
- \`gymOrgId\` (uuid) — Tenancy.
- \`planId\` (uuid) — Snapshotted plan.
- \`kind\` (enum) — Values: \`BASE\`, \`ADDON\`.
- \`capability\` (enum or null) — \`TRAINER_COACHING\` for ADDON; \`null\` for BASE.
- \`priceAmount\` (number) — Snapshot price.
- \`durationDays\` (integer) — Snapshot duration.
- \`startDate\` (string \`YYYY-MM-DD\` or null) — Null = unstarted BASE.
- \`endDate\` (string \`YYYY-MM-DD\` or null) — Inclusive end.
- \`startSource\` (enum or null) — Values: \`FIRST_ATTENDANCE\`, \`ADMIN_OVERRIDE\`, \`ADMIN_ATTACH\`, or \`null\`.
- \`paymentStatus\` (enum) — Values: \`paid\`, \`unpaid\`, \`partial\`. Does **not** lock entitlements.
- \`amountPaid\` (number) — Derived/partial amount.
- \`createdAt\` / \`updatedAt\` (string, ISO)

**Errors:** \`403\` PLAN_FORBIDDEN · \`404\` no ACTIVE membership

Guide: gym-backend \`docs/subscriptions.md\`.`,
  },
  response: [
    example('200 OK — lines', 200, 'OK', { subscriptions: [sub] }, 'GET', u1),
    example(
      '404 — no ACTIVE membership',
      404,
      'Not Found',
      err('NOT_FOUND', 'Active membership not found'),
      'GET',
      u1,
    ),
  ],
});

const u2 = url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/subscriptions/{{subscriptionId}}/payment', [
  'gym-orgs',
  '{{gymOrgId}}',
  'subscriptions',
  '{{subscriptionId}}',
  'payment',
]);
const bodyPaid = { paymentStatus: 'paid' };
const paidSub = {
  ...sub,
  paymentStatus: 'paid',
  amountPaid: 999,
  updatedAt: '2026-08-09T10:00:00.000Z',
};
folder.item.push({
  name: 'Update Subscription Payment',
  request: {
    method: 'PATCH',
    header: HEADERS,
    url: u2,
    body: {
      mode: 'raw',
      raw: JSON.stringify(bodyPaid, null, 2),
      options: { raw: { language: 'json' } },
    },
    description: `PATCH /gym-orgs/:gymOrgId/subscriptions/:subscriptionId/payment — Admin set payment status.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid)
- \`subscriptionId\` (uuid) — From list → \`{{subscriptionId}}\`

**Request body (JSON):**
- \`paymentStatus\` (required, enum) — Values: \`paid\`, \`unpaid\`, \`partial\`.
- \`amountPaid\` (conditional, number) — Required when \`partial\` (strictly between 0 and snapshotted \`priceAmount\`). Optional for \`paid\`/\`unpaid\` (server derives 0 or full price). Example: \`250.5\`.

**Success \`200\`:** \`{ subscription }\`  
**Errors:** \`403\` PLAN_FORBIDDEN · \`404\` NOT_FOUND · \`422\` INVALID_SUBSCRIPTION_PAYMENT / VALIDATION_ERROR`,
  },
  response: [
    example('200 OK — paid', 200, 'OK', { subscription: paidSub }, 'PATCH', u2, bodyPaid),
    example(
      '422 — partial without amountPaid',
      422,
      'Unprocessable Entity',
      err('VALIDATION_ERROR', 'Partial payment requires amountPaid'),
      'PATCH',
      u2,
      { paymentStatus: 'partial' },
    ),
  ],
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          'if (pm.response.code === 200) {',
          '  const body = pm.response.json();',
          '  if (body.subscription && body.subscription.id) {',
          "    pm.collectionVariables.set('subscriptionId', body.subscription.id);",
          '  }',
          '}',
        ],
      },
    },
  ],
});

const u3 = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/subscriptions/{{subscriptionId}}/start-override',
  ['gym-orgs', '{{gymOrgId}}', 'subscriptions', '{{subscriptionId}}', 'start-override'],
);
const bodyStart = { startDate: '2026-08-01' };
const started = {
  ...sub,
  startDate: '2026-08-01',
  endDate: '2026-08-30',
  startSource: 'ADMIN_OVERRIDE',
  updatedAt: '2026-08-09T10:05:00.000Z',
};
folder.item.push({
  name: 'Override Subscription Start',
  request: {
    method: 'POST',
    header: HEADERS,
    url: u3,
    body: {
      mode: 'raw',
      raw: JSON.stringify(bodyStart, null, 2),
      options: { raw: { language: 'json' } },
    },
    description: `POST /gym-orgs/:gymOrgId/subscriptions/:subscriptionId/start-override — Admin start an **unstarted BASE** line (A19).

**Auth:** Bearer ADMIN at gym  
**Path:** \`gymOrgId\`, \`subscriptionId\`

**Request body (JSON):**
- \`startDate\` (required, string \`YYYY-MM-DD\`) — Inclusive start. Sets \`endDate = startDate + durationDays - 1\`, \`startSource = ADMIN_OVERRIDE\`. Example: \`"2026-08-01"\`.

Only **unstarted BASE** (\`startDate\` null). ADDON or already-started → \`INVALID_SUBSCRIPTION_START\`.

**Success \`200\`:** \`{ subscription }\`  
**Errors:** \`403\` · \`404\` · \`422\` INVALID_SUBSCRIPTION_START · \`409\` overlap (ADR-0004)`,
  },
  response: [
    example('200 OK — started', 200, 'OK', { subscription: started }, 'POST', u3, bodyStart),
    example(
      '422 — already started / ADDON',
      422,
      'Unprocessable Entity',
      err('INVALID_SUBSCRIPTION_START', 'Subscription start cannot be overridden'),
      'POST',
      u3,
      bodyStart,
    ),
  ],
});

const u4 = url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/my-subscriptions', [
  'gym-orgs',
  '{{gymOrgId}}',
  'my-subscriptions',
]);
folder.item.push({
  name: 'List My Subscriptions',
  request: {
    method: 'GET',
    header: ACCEPT_ONLY,
    url: u4,
    description: `GET /gym-orgs/:gymOrgId/my-subscriptions — Client self-read of ACTIVE membership lines (C10).

**Auth:** Bearer CLIENT with ACTIVE membership at gym  
**Path:** \`gymOrgId\`

**Success \`200\`:** \`{ subscriptions: [ ... ] }\` — same \`subscription\` shape as Admin list.  
**Errors:** \`403\` SUBSCRIPTION_FORBIDDEN · \`404\` no ACTIVE membership`,
  },
  response: [
    example('200 OK — mine', 200, 'OK', { subscriptions: [sub] }, 'GET', u4),
    example(
      '403 — non-CLIENT / no grant',
      403,
      'Forbidden',
      err('SUBSCRIPTION_FORBIDDEN', 'Subscription access forbidden'),
      'GET',
      u4,
    ),
  ],
});

c.item = (c.item ?? []).filter((i) => i.name !== 'Subscriptions');
c.item.push(folder);

const vars = c.variable ?? [];
const keys = new Set(vars.map((v) => v.key));
if (!keys.has('clientUserId')) {
  vars.push({
    key: 'clientUserId',
    value: '',
    type: 'default',
    description: 'Client user id for Admin subscription list (from invitee /auth/me)',
  });
}
if (!keys.has('subscriptionId')) {
  vars.push({
    key: 'subscriptionId',
    value: '',
    type: 'default',
    description: 'Set from List Client Subscriptions / payment response',
  });
}
c.variable = vars;

const desc = c.info?.description ?? '';
if (!desc.includes('Subscriptions')) {
  c.info.description = desc.replace(
    'Membership Invites + DataGrants.',
    'Membership Invites + DataGrants + Subscriptions.',
  );
}

writeFileSync(collectionPath, `${JSON.stringify(c, null, 2)}\n`);

if (existsSync(readmePath)) {
  let text = readFileSync(readmePath, 'utf8');
  if (!text.includes('Subscriptions')) {
    text = text.replace(
      '| `Gym-Backend-API.postman_collection.json` | Auth + Gym Orgs + Staff Invites + Leads + Plans + Membership Invites, AI-oriented docs, saved Examples |',
      '| `Gym-Backend-API.postman_collection.json` | Auth + Gym Orgs + Staff Invites + Leads + Plans + Membership Invites + Subscriptions, AI-oriented docs, saved Examples |',
    );
    const old = `   3. Client: **Get My Data Grants** / **Update My Data Grants** while ACTIVE
   4. Or admin: **List Membership Invites** → **Revoke Membership Invite** while still \`PENDING\`

\`baseUrl\` defaults`;
    const neu = `   3. Client: **Get My Data Grants** / **Update My Data Grants** while ACTIVE
   4. Or admin: **List Membership Invites** → **Revoke Membership Invite** while still \`PENDING\`
12. Subscriptions (after accept; needs \`clientUserId\` / \`subscriptionId\`):
   1. Admin: **Subscriptions → List Client Subscriptions**
   2. Admin: **Update Subscription Payment** / **Override Subscription Start** (unstarted BASE)
   3. Client: **List My Subscriptions**

\`baseUrl\` defaults`;
    if (text.includes(old)) text = text.replace(old, neu);
    if (!text.includes('docs/subscriptions.md')) {
      text = text.replace(
        '- [`docs/leads.md`](https://github.com/abdulhasibn/gym-backend/blob/main/docs/leads.md)',
        '- [`docs/leads.md`](https://github.com/abdulhasibn/gym-backend/blob/main/docs/leads.md)\n- [`docs/subscriptions.md`](https://github.com/abdulhasibn/gym-backend/blob/main/docs/subscriptions.md)',
      );
    }
    writeFileSync(readmePath, text);
  }
}

console.log(
  JSON.stringify(
    {
      folders: c.item.map((i) => i.name),
      subscriptionRequests: folder.item.map((i) => i.name),
    },
    null,
    2,
  ),
);
