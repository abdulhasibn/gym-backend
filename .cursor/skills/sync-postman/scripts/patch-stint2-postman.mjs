#!/usr/bin/env node
/**
 * Patch Gym Backend Postman collection with Stint 2 folders (Attendance, Profile & Progress)
 * + renewals-due under Subscriptions. Includes Docs + Examples.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(
  new URL('.', import.meta.url).pathname,
  '../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);
// Fix for file:// on macOS
const collectionPath = resolve(
  process.env.HOME,
  'Projects/gym-backend-postman/Gym-Backend-API.postman_collection.json',
);

const c = JSON.parse(readFileSync(collectionPath, 'utf8'));

const jsonHeaders = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
];
const acceptHeader = [{ key: 'Accept', value: 'application/json' }];

function url(raw, pathParts, query) {
  const u = {
    raw,
    host: ['{{baseUrl}}'],
    path: pathParts,
  };
  if (query) u.query = query;
  return u;
}

function example(name, code, status, req, bodyObj) {
  return {
    name,
    originalRequest: {
      method: req.method,
      header: req.header,
      url: req.url,
      ...(req.body ? { body: req.body } : {}),
    },
    status,
    code,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body: JSON.stringify(bodyObj, null, 2),
  };
}

const attendanceSample = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  clientUserId: '22222222-2222-4222-8222-222222222222',
  gymOrgId: '33333333-3333-4333-8333-333333333333',
  occurredAt: '2026-08-11T10:00:00.000Z',
  recordedBy: 'CLIENT',
  recorderUserId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-08-11T10:00:00.000Z',
  baseStarted: true,
};

const profileSample = {
  userId: '22222222-2222-4222-8222-222222222222',
  heightCm: 170,
  weightKg: 68,
  dob: '1990-01-15',
  gender: 'MALE',
  medicalNotes: null,
  bmi: 23.5,
  createdAt: '2026-08-02T12:00:00.000Z',
  updatedAt: '2026-08-11T10:05:00.000Z',
};

const progressSample = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  clientUserId: '22222222-2222-4222-8222-222222222222',
  logDate: '2026-08-11',
  weightKg: 68,
  bmi: 23.5,
  notes: null,
  createdAt: '2026-08-11T10:05:00.000Z',
};

const page = (items) => ({ items, total: items.length, limit: 20, offset: 0 });

const err = (code, message) => ({ error: { code, message } });

// --- Attendance ---
const selfCheckInReq = {
  method: 'POST',
  header: acceptHeader,
  url: url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/attendances/check-in', [
    'gym-orgs',
    '{{gymOrgId}}',
    'attendances',
    'check-in',
  ]),
  description: `POST /gym-orgs/:gymOrgId/attendances/check-in — Client self check-in (C4).

**Auth:** Bearer CLIENT  
**Path:**
- \`gymOrgId\` (uuid) — Gym. Example: \`{{gymOrgId}}\`.

No body. Eligibility: ACTIVE membership, \`!checkInBlocked\`, BASE unstarted **or** in-date (gym TZ). Unstarted BASE starts with \`startSource = FIRST_ATTENDANCE\`. Payment status does **not** block.

**Success \`201\`:** \`{ attendance }\`

**\`attendance\` fields:**
- \`id\` (uuid) — Attendance id.
- \`clientUserId\` (uuid) — Member.
- \`gymOrgId\` (uuid) — Gym.
- \`occurredAt\` (ISO timestamptz) — Check-in instant (UTC).
- \`recordedBy\` (enum) — Values: \`CLIENT\`, \`ADMIN\`.
- \`recorderUserId\` (uuid) — Actor who recorded.
- \`createdAt\` (ISO timestamptz).
- \`baseStarted\` (boolean) — \`true\` if this check-in started an unstarted BASE.

**Errors:** \`403\` ATTENDANCE_FORBIDDEN · \`422\` CHECK_IN_NOT_ALLOWED (\`NO_ACTIVE_MEMBERSHIP\`, \`CHECK_IN_BLOCKED\`, \`NO_BASE_SUBSCRIPTION\`, \`BASE_OUT_OF_DATE\`)`,
};

const deskMarkReq = {
  method: 'POST',
  header: jsonHeaders,
  url: url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/attendances/desk-mark', [
    'gym-orgs',
    '{{gymOrgId}}',
    'attendances',
    'desk-mark',
  ]),
  body: {
    mode: 'raw',
    raw: '{\n  "clientUserId": "{{clientUserId}}"\n}',
    options: { raw: { language: 'json' } },
  },
  description: `POST /gym-orgs/:gymOrgId/attendances/desk-mark — Admin desk mark present (A5).

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym. Example: \`{{gymOrgId}}\`.

**Request body (JSON):**
- \`clientUserId\` (required, uuid) — Member to mark. Example: \`{{clientUserId}}\`.

Same eligibility as self check-in. \`recordedBy = ADMIN\`. Trainer cannot write.

**Success \`201\`:** \`{ attendance }\` (same shape as check-in; \`recordedBy\` is \`ADMIN\`)  
**Errors:** \`403\` · \`422\` CHECK_IN_NOT_ALLOWED · \`422\` VALIDATION_ERROR`,
};

const listGymDayReq = {
  method: 'GET',
  header: acceptHeader,
  url: url(
    '{{baseUrl}}/gym-orgs/{{gymOrgId}}/attendances?day=2026-08-11&limit=20&offset=0',
    ['gym-orgs', '{{gymOrgId}}', 'attendances'],
    [
      {
        key: 'day',
        value: '2026-08-11',
        description: 'Optional YYYY-MM-DD in gym TZ. Default: gym-local today.',
      },
      { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
      { key: 'offset', value: '0', description: 'Offset. Default 0.' },
    ],
  ),
  description: `GET /gym-orgs/:gymOrgId/attendances — Admin gym-day attendance list.

**Auth:** Bearer ADMIN at gym  
**Path:** \`gymOrgId\`

**Query:**
- \`day\` (optional, string \`YYYY-MM-DD\`) — Gym-local calendar day. Default: today in gym timezone.
- \`limit\` (optional, int 1–100) — Default 20.
- \`offset\` (optional, int ≥0) — Default 0.

**Success \`200\`:** \`{ attendances: { items, total, limit, offset } }\`  
**\`items[]\`:** attendance DTO; \`baseStarted\` is always \`false\` on list reads.  
**Errors:** \`403\` · \`422\` VALIDATION_ERROR`,
};

const listClientAttReq = {
  method: 'GET',
  header: acceptHeader,
  url: url(
    '{{baseUrl}}/gym-orgs/{{gymOrgId}}/attendances/clients/{{clientUserId}}?limit=20&offset=0',
    ['gym-orgs', '{{gymOrgId}}', 'attendances', 'clients', '{{clientUserId}}'],
    [
      { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
      { key: 'offset', value: '0', description: 'Offset. Default 0.' },
    ],
  ),
  description: `GET /gym-orgs/:gymOrgId/attendances/clients/:clientUserId — Staff per-client attendance history (gym-owned; no PROGRESS grant required).

**Auth:** Bearer ADMIN or TRAINER live at gym  
**Path:** \`gymOrgId\`, \`clientUserId\`

**Query:** \`limit\`, \`offset\` (same as list gym day).

**Success \`200\`:** \`{ attendances: { items, total, limit, offset } }\`  
**Errors:** \`403\` ATTENDANCE_FORBIDDEN`,
};

const listMyAttReq = {
  method: 'GET',
  header: acceptHeader,
  url: url(
    '{{baseUrl}}/gym-orgs/{{gymOrgId}}/my-attendances?limit=20&offset=0',
    ['gym-orgs', '{{gymOrgId}}', 'my-attendances'],
    [
      { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
      { key: 'offset', value: '0', description: 'Offset. Default 0.' },
    ],
  ),
  description: `GET /gym-orgs/:gymOrgId/my-attendances — Client own attendance history at this gym.

**Auth:** Bearer CLIENT  
**Path:** \`gymOrgId\`

**Query:** \`limit\`, \`offset\`.

**Success \`200\`:** \`{ attendances: { items, total, limit, offset } }\`  
**Errors:** \`403\` ATTENDANCE_FORBIDDEN`,
};

const attendanceFolder = {
  name: 'Attendance',
  item: [
    {
      name: 'Self Check-in',
      request: selfCheckInReq,
      response: [
        example('201 Created — check-in', 201, 'Created', selfCheckInReq, {
          attendance: attendanceSample,
        }),
        example('422 — CHECK_IN_BLOCKED', 422, 'Unprocessable Entity', selfCheckInReq, err('CHECK_IN_NOT_ALLOWED', 'Check-in is blocked for this member')),
      ],
    },
    {
      name: 'Desk Mark',
      request: deskMarkReq,
      response: [
        example('201 Created — desk mark', 201, 'Created', deskMarkReq, {
          attendance: { ...attendanceSample, recordedBy: 'ADMIN', recorderUserId: '11111111-1111-4111-8111-111111111111', baseStarted: false },
        }),
        example('403 — ATTENDANCE_FORBIDDEN', 403, 'Forbidden', deskMarkReq, err('ATTENDANCE_FORBIDDEN', 'Not allowed to perform this attendance action')),
      ],
    },
    {
      name: 'List Gym Day Attendances',
      request: listGymDayReq,
      response: [
        example('200 OK — gym day', 200, 'OK', listGymDayReq, {
          attendances: page([{ ...attendanceSample, baseStarted: false }]),
        }),
      ],
    },
    {
      name: 'List Client Attendances',
      request: listClientAttReq,
      response: [
        example('200 OK — client history', 200, 'OK', listClientAttReq, {
          attendances: page([{ ...attendanceSample, baseStarted: false }]),
        }),
      ],
    },
    {
      name: 'List My Attendances',
      request: listMyAttReq,
      response: [
        example('200 OK — my history', 200, 'OK', listMyAttReq, {
          attendances: page([{ ...attendanceSample, baseStarted: false }]),
        }),
      ],
    },
  ],
};

// --- Profile & Progress ---
const getMyProfileReq = {
  method: 'GET',
  header: acceptHeader,
  url: url('{{baseUrl}}/me/profile', ['me', 'profile']),
  description: `GET /me/profile — Client own profile + BMI (C7, C8, C14).

**Auth:** Bearer CLIENT

**Success \`200\`:** \`{ profile }\`

**\`profile\` fields:**
- \`userId\` (uuid)
- \`heightCm\` (number|null) — Height cm.
- \`weightKg\` (number|null) — Current weight kg (from latest ProgressLog / profile edit).
- \`dob\` (string|null \`YYYY-MM-DD\`)
- \`gender\` (enum|null) — Values: \`MALE\`, \`FEMALE\`, \`OTHER\`.
- \`medicalNotes\` (string|null) — Sensitive; never log.
- \`bmi\` (number|null) — Derived when height + weight set.
- \`createdAt\`, \`updatedAt\` (ISO timestamptz)

**Errors:** \`403\` USERS_FORBIDDEN · \`404\` NOT_FOUND`,
};

const patchMyProfileReq = {
  method: 'PATCH',
  header: jsonHeaders,
  url: url('{{baseUrl}}/me/profile', ['me', 'profile']),
  body: {
    mode: 'raw',
    raw: JSON.stringify(
      {
        heightCm: 170,
        weightKg: 68,
        dob: '1990-01-15',
        gender: 'MALE',
        medicalNotes: null,
      },
      null,
      2,
    ),
    options: { raw: { language: 'json' } },
  },
  description: `PATCH /me/profile — Client edit profile. Weight change upserts **today’s** ProgressLog (UTC calendar day) and refreshes \`weight_kg\`.

**Auth:** Bearer CLIENT

**Request body (JSON):** all fields required (nullable):
- \`heightCm\` (number|null) — 0–300 cm.
- \`weightKg\` (number|null) — 0–500 kg.
- \`dob\` (string|null \`YYYY-MM-DD\`)
- \`gender\` (enum|null) — Values: \`MALE\`, \`FEMALE\`, \`OTHER\`.
- \`medicalNotes\` (string|null) — Max 5000 chars.

**Success \`200\`:** \`{ profile }\`  
**Errors:** \`403\` · \`404\` · \`422\` VALIDATION_ERROR / INVALID_PROFILE`,
};

const listMyProgressReq = {
  method: 'GET',
  header: acceptHeader,
  url: url('{{baseUrl}}/me/progress-logs?limit=20&offset=0', ['me', 'progress-logs'], [
    { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
    { key: 'offset', value: '0', description: 'Offset. Default 0.' },
  ]),
  description: `GET /me/progress-logs — Client own progress / weight history.

**Auth:** Bearer CLIENT

**Query:** \`limit\`, \`offset\`.

**Success \`200\`:** \`{ progressLogs: { items, total, limit, offset } }\`

**\`items[]\` fields:**
- \`id\` (uuid)
- \`clientUserId\` (uuid)
- \`logDate\` (string \`YYYY-MM-DD\`)
- \`weightKg\` (number|null)
- \`bmi\` (number|null) — Denorm at write from height + weight.
- \`notes\` (string|null)
- \`createdAt\` (ISO timestamptz)

**Errors:** \`403\``,
};

const upsertProgressReq = {
  method: 'PUT',
  header: jsonHeaders,
  url: url('{{baseUrl}}/me/progress-logs', ['me', 'progress-logs']),
  body: {
    mode: 'raw',
    raw: JSON.stringify({ logDate: '2026-08-11', weightKg: 68, notes: null }, null, 2),
    options: { raw: { language: 'json' } },
  },
  description: `PUT /me/progress-logs — Upsert ProgressLog for a calendar date; updates profile current weight when \`weightKg\` set.

**Auth:** Bearer CLIENT

**Request body (JSON):**
- \`logDate\` (required, string \`YYYY-MM-DD\`) — Client calendar date.
- \`weightKg\` (required, number|null) — 0–500 kg.
- \`notes\` (required, string|null) — Max 2000 chars.

**Success \`200\`:** \`{ progressLog }\`  
**Errors:** \`403\` · \`404\` · \`422\``,
};

const staffProfileReq = {
  method: 'GET',
  header: acceptHeader,
  url: url('{{baseUrl}}/gym-orgs/{{gymOrgId}}/clients/{{clientUserId}}/profile', [
    'gym-orgs',
    '{{gymOrgId}}',
    'clients',
    '{{clientUserId}}',
    'profile',
  ]),
  description: `GET /gym-orgs/:gymOrgId/clients/:clientUserId/profile — Staff read of granted profile fields (T4, A17).

**Auth:** Bearer ADMIN or TRAINER live at gym  
**Path:** \`gymOrgId\`, \`clientUserId\`

Requires ACTIVE membership + live grants. Response fields filtered to granted profile attributes. BMI only if HEIGHT **and** WEIGHT granted. MEDICAL_NOTES only with that attribute grant. Absent affiliation/grants → \`403\`.

**Success \`200\`:** \`{ profile }\` (ungranted fields null)  
**Errors:** \`403\` USERS_FORBIDDEN · \`404\` NOT_FOUND`,
};

const staffProgressReq = {
  method: 'GET',
  header: acceptHeader,
  url: url(
    '{{baseUrl}}/gym-orgs/{{gymOrgId}}/clients/{{clientUserId}}/progress-logs?limit=20&offset=0',
    ['gym-orgs', '{{gymOrgId}}', 'clients', '{{clientUserId}}', 'progress-logs'],
    [
      { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
      { key: 'offset', value: '0', description: 'Offset. Default 0.' },
    ],
  ),
  description: `GET /gym-orgs/:gymOrgId/clients/:clientUserId/progress-logs — Staff progress history; requires \`PROGRESS\` class DataGrant.

**Auth:** Bearer ADMIN or TRAINER live at gym  
**Path:** \`gymOrgId\`, \`clientUserId\`

**Query:** \`limit\`, \`offset\`.

**Success \`200\`:** \`{ progressLogs: { items, total, limit, offset } }\`  
**Errors:** \`403\` USERS_FORBIDDEN (no PROGRESS grant / no active membership)`,
};

const profileFolder = {
  name: 'Profile & Progress',
  item: [
    {
      name: 'Get My Profile',
      request: getMyProfileReq,
      response: [
        example('200 OK — profile', 200, 'OK', getMyProfileReq, { profile: profileSample }),
        example('403 — USERS_FORBIDDEN', 403, 'Forbidden', getMyProfileReq, err('USERS_FORBIDDEN', 'Not allowed to access this user data')),
      ],
    },
    {
      name: 'Update My Profile',
      request: patchMyProfileReq,
      response: [
        example('200 OK — updated', 200, 'OK', patchMyProfileReq, { profile: profileSample }),
        example('422 — VALIDATION_ERROR', 422, 'Unprocessable Entity', patchMyProfileReq, err('VALIDATION_ERROR', 'Height must be between 0 and 300 cm')),
      ],
    },
    {
      name: 'List My Progress Logs',
      request: listMyProgressReq,
      response: [
        example('200 OK — progress', 200, 'OK', listMyProgressReq, {
          progressLogs: page([progressSample]),
        }),
      ],
    },
    {
      name: 'Upsert My Progress Log',
      request: upsertProgressReq,
      response: [
        example('200 OK — upserted', 200, 'OK', upsertProgressReq, { progressLog: progressSample }),
        example('422 — invalid date', 422, 'Unprocessable Entity', upsertProgressReq, err('VALIDATION_ERROR', 'Calendar date must be YYYY-MM-DD')),
      ],
    },
    {
      name: 'Get Staff Client Profile',
      request: staffProfileReq,
      response: [
        example('200 OK — granted fields', 200, 'OK', staffProfileReq, {
          profile: { ...profileSample, medicalNotes: null, gender: null },
        }),
        example('403 — no grants', 403, 'Forbidden', staffProfileReq, err('USERS_FORBIDDEN', 'No active membership or grants for this client at gym')),
      ],
    },
    {
      name: 'List Staff Client Progress Logs',
      request: staffProgressReq,
      response: [
        example('200 OK — with PROGRESS grant', 200, 'OK', staffProgressReq, {
          progressLogs: page([progressSample]),
        }),
        example('403 — missing PROGRESS', 403, 'Forbidden', staffProgressReq, err('USERS_FORBIDDEN', 'PROGRESS grant required to view client progress')),
      ],
    },
  ],
};

// --- Renewals due ---
const renewalsReq = {
  method: 'GET',
  header: acceptHeader,
  url: url(
    '{{baseUrl}}/gym-orgs/{{gymOrgId}}/subscriptions/renewals-due?onOrBefore=2026-08-31&onOrAfter=2026-08-01&limit=20&offset=0',
    ['gym-orgs', '{{gymOrgId}}', 'subscriptions', 'renewals-due'],
    [
      {
        key: 'onOrBefore',
        value: '2026-08-31',
        description: 'Inclusive end_date upper bound YYYY-MM-DD. Default: UTC today.',
      },
      {
        key: 'onOrAfter',
        value: '2026-08-01',
        disabled: true,
        description: 'Optional inclusive end_date lower bound YYYY-MM-DD.',
      },
      { key: 'limit', value: '20', description: 'Page size 1–100. Default 20.' },
      { key: 'offset', value: '0', description: 'Offset. Default 0.' },
    ],
  ),
  description: `GET /gym-orgs/:gymOrgId/subscriptions/renewals-due — Admin renewals / expiring-soon list (A9). BASE + ADDON, labeled by \`kind\` / \`capability\`. No push yet.

**Auth:** Bearer ADMIN at gym  
**Path:** \`gymOrgId\`

**Query:**
- \`onOrBefore\` (optional, \`YYYY-MM-DD\`) — Inclusive upper bound on \`end_date\`. Default: UTC today.
- \`onOrAfter\` (optional, \`YYYY-MM-DD\`) — Inclusive lower bound on \`end_date\`.
- \`limit\`, \`offset\` — Pagination.

**Success \`200\`:** \`{ renewals: { items, total, limit, offset } }\`

**\`items[]\`:** subscription DTO fields plus:
- \`clientUserId\` (uuid) — Member owning the membership line.
- \`kind\` (enum) — Values: \`BASE\`, \`ADDON\`.
- \`capability\` (enum|null) — ADDON only. Values: \`TRAINER_COACHING\`.
- \`endDate\` (string|null \`YYYY-MM-DD\`) — Expiry.
- \`paymentStatus\` (enum) — Values: \`paid\`, \`unpaid\`, \`partial\`.

**Errors:** \`403\` PLAN_FORBIDDEN · \`422\` VALIDATION_ERROR`,
};

const renewalItem = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  clientMembershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  gymOrgId: '33333333-3333-4333-8333-333333333333',
  planId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  kind: 'BASE',
  capability: null,
  priceAmount: 999,
  durationDays: 30,
  startDate: '2026-08-01',
  endDate: '2026-08-30',
  startSource: 'FIRST_ATTENDANCE',
  paymentStatus: 'unpaid',
  amountPaid: 0,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
  clientUserId: '22222222-2222-4222-8222-222222222222',
};

// Apply patches
c.info.description = `Gym Backend Express API — Auth, Gym Orgs, Staff Invites, Leads, Plans, Membership Invites + DataGrants, Subscriptions, Roster, Attendance, Profile & Progress.

Each request documents **every property** (body / query / response) with types, full enums, and examples. Open **Examples** for concrete JSON.

Markdown guides in gym-backend: \`docs/api.md\`, \`docs/client-auth.md\`, \`docs/plans.md\`, \`docs/membership-invites.md\`, \`docs/subscriptions.md\`, \`docs/roster.md\`, \`docs/leads.md\`.

Shared error envelope: \`{ "error": { "code": string, "message": string } }\`
Pagination: \`limit\` default 20 max 100; \`offset\` default 0; page \`{ items, total, limit, offset }\`.`;

// Remove existing Stint 2 folders if re-run
c.item = c.item.filter((f) => f.name !== 'Attendance' && f.name !== 'Profile & Progress');

const subs = c.item.find((f) => f.name === 'Subscriptions');
if (subs) {
  subs.item = subs.item.filter((r) => r.name !== 'List Renewals Due');
  subs.item.push({
    name: 'List Renewals Due',
    request: renewalsReq,
    response: [
      example('200 OK — renewals window', 200, 'OK', renewalsReq, {
        renewals: page([renewalItem]),
      }),
      example('403 — PLAN_FORBIDDEN', 403, 'Forbidden', renewalsReq, err('PLAN_FORBIDDEN', 'Not allowed to manage plans for this gym')),
    ],
  });
}

c.item.push(attendanceFolder, profileFolder);

writeFileSync(collectionPath, JSON.stringify(c, null, 2) + '\n');
console.log('Wrote', collectionPath);
console.log(
  'Top-level folders:',
  c.item.map((i) => i.name).join(', '),
);
