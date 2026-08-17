#!/usr/bin/env node
/**
 * Insert Gym Orgs → List Gym Trainers into the git export.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const collectionPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);

const description = `**Story:** A gym admin opens the gym’s trainer list to pick who to assign to a client.

GET /gym-orgs/:gymOrgId/trainers — live trainer profiles at the gym (accepted Trainer invites plus Admin-as-Trainer). Use trainerProfileId on Assign Trainer. Not staff invites (those return invitedUserId, which is users.id).

**Auth:** Bearer ADMIN at gym  
**Path:** \`gymOrgId\`

**Query params:**
- \`limit\` (optional, integer) — Page size 1–100, default 20. Example: \`20\`.
- \`offset\` (optional, integer) — Skip, default 0. Example: \`0\`.

**Success \`200\`:** \`{ trainers: { items, total, limit, offset } }\` ordered by createdAt ascending.

**Each item:**
- \`trainerProfileId\` (uuid) — \`trainer_profiles.id\`. Pass to assign-trainer. Example: \`{{trainerProfileId}}\`.
- \`userId\` (uuid) — Staff user id.
- \`gymOrgId\` (uuid) — Gym.
- \`name\` (string) — Display name. Example: \`"Owner Admin"\`.
- \`email\` (string) — Email. Example: \`"owner@example.com"\`.
- \`staffCode\` (string or null) — Staff lookup code. Example: \`"STAFF-AB12"\`.
- \`bio\` (string or null) — Optional bio.
- \`isAdmin\` (boolean) — Live gym_admins row at this gym (Admin-as-Trainer).
- \`createdAt\` (string, ISO) — Profile created.

**Errors:** \`401\` AUTHENTICATION_FAILED · \`403\` GYM_ORG_ADMIN_FORBIDDEN · \`422\` VALIDATION_ERROR`;

const url = {
  raw: '{{baseUrl}}/gym-orgs/{{gymOrgId}}/trainers?limit=20&offset=0',
  host: ['{{baseUrl}}'],
  path: ['gym-orgs', '{{gymOrgId}}', 'trainers'],
  query: [
    {
      key: 'limit',
      value: '20',
      description: 'Page size. Integer 1–100. Default 20. Example: `20`.',
    },
    {
      key: 'offset',
      value: '0',
      description: 'Skip count. Integer ≥ 0. Default 0. Example: `0`.',
    },
  ],
};

const acceptHeader = [{ value: 'application/json', key: 'Accept' }];

const okBody = `{
  "trainers": {
    "items": [
      {
        "trainerProfileId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "userId": "22222222-2222-4222-8222-222222222222",
        "gymOrgId": "33333333-3333-4333-8333-333333333333",
        "name": "Owner Admin",
        "email": "owner@example.com",
        "staffCode": "STAFF-AB12",
        "bio": null,
        "isAdmin": true,
        "createdAt": "2026-08-08T12:00:00.000Z"
      },
      {
        "trainerProfileId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "userId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "gymOrgId": "33333333-3333-4333-8333-333333333333",
        "name": "Ada Trainer",
        "email": "trainer@example.com",
        "staffCode": "STAFF-T1",
        "bio": "PT",
        "isAdmin": false,
        "createdAt": "2026-08-09T12:00:00.000Z"
      }
    ],
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}`;

const item = {
  name: 'List Gym Trainers',
  event: [
    {
      listen: 'test',
      script: {
        exec: [
          "pm.test('Status is 200', function () {",
          '  pm.response.to.have.status(200);',
          '});',
          '',
          'const body = pm.response.json();',
          '',
          "pm.test('trainers page shape', function () {",
          "  pm.expect(body).to.have.property('trainers');",
          "  pm.expect(body.trainers).to.include.keys('items', 'total', 'limit', 'offset');",
          "  pm.expect(body.trainers.items).to.be.an('array');",
          '});',
          '',
          'if (pm.response.code === 200 && body.trainers && body.trainers.items && body.trainers.items[0]) {',
          "  pm.collectionVariables.set('trainerProfileId', body.trainers.items[0].trainerProfileId);",
          "  pm.environment.set('trainerProfileId', body.trainers.items[0].trainerProfileId);",
          '}',
        ],
        type: 'text/javascript',
      },
    },
  ],
  id: randomUUID(),
  request: {
    method: 'GET',
    header: acceptHeader,
    url,
    description,
  },
  response: [
    {
      id: randomUUID(),
      name: '200 OK — gym trainers',
      originalRequest: {
        method: 'GET',
        header: acceptHeader,
        url,
        description,
      },
      status: 'OK',
      code: 200,
      _postman_previewlanguage: 'json',
      header: acceptHeader,
      cookie: [],
      responseTime: null,
      body: okBody,
    },
    {
      id: randomUUID(),
      name: '403 — GYM_ORG_ADMIN_FORBIDDEN',
      originalRequest: {
        method: 'GET',
        header: acceptHeader,
        url,
        description,
      },
      status: 'Forbidden',
      code: 403,
      _postman_previewlanguage: 'json',
      header: acceptHeader,
      cookie: [],
      responseTime: null,
      body: `{
  "error": {
    "code": "GYM_ORG_ADMIN_FORBIDDEN",
    "message": "Not allowed to administer this gym organization"
  }
}`,
    },
  ],
};

const raw = JSON.parse(readFileSync(collectionPath, 'utf8'));
const gymOrgs = raw.item.find((folder) => folder.name === 'Gym Orgs');
if (!gymOrgs) {
  throw new Error('Gym Orgs folder not found');
}
if (gymOrgs.item.some((row) => row.name === 'List Gym Trainers')) {
  console.log('List Gym Trainers already present');
} else {
  const after = gymOrgs.item.findIndex((row) => row.name === 'Update Gym Org');
  const index = after >= 0 ? after + 1 : gymOrgs.item.length;
  gymOrgs.item.splice(index, 0, item);
}

const trainerVar = (raw.variable ?? []).find((row) => row.key === 'trainerProfileId');
if (trainerVar) {
  trainerVar.description =
    'Live trainer_profiles.id at gym (set by List Gym Trainers, or Admin-as-Trainer self)';
}

function walk(items) {
  for (const row of items ?? []) {
    if (row.item) walk(row.item);
    if (row.name === 'Assign Trainer' && row.request?.description) {
      row.request.description = row.request.description.replace(
        'POST /gym-orgs/:gymOrgId/members/:membershipId/assign-trainer — Admin assign/reassign.',
        'POST /gym-orgs/:gymOrgId/members/:membershipId/assign-trainer — Admin assign/reassign. Get trainerProfileId from List Gym Trainers.',
      );
    }
  }
}
walk(raw.item);

const json = JSON.stringify(raw, null, 2).replace(/[\u007f-\uffff]/g, (ch) => {
  return `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
});
writeFileSync(collectionPath, `${json}\n`);
console.log(
  JSON.stringify({
    folder: 'Gym Orgs',
    request: 'List Gym Trainers',
    gymOrgRequests: gymOrgs.item.filter((row) => row.request).map((row) => row.name),
  }),
);
