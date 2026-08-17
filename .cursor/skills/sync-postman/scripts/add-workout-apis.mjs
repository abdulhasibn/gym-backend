#!/usr/bin/env node
/**
 * Insert Stint 3.2 workout requests into Coaching (git export).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const collectionPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);

const jsonHeaders = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
];
const acceptHeader = [{ key: 'Accept', value: 'application/json' }];

const exerciseId = 'e0e00000-0000-4000-8000-000000000001';
const planId = '55555555-5555-4555-8555-555555555555';
const dayId = '66666666-6666-4666-8666-666666666666';
const itemId = '77777777-7777-4777-8777-777777777777';
const gymOrgId = '33333333-3333-4333-8333-333333333333';
const clientUserId = '11111111-1111-4111-8111-111111111111';
const trainerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const assignBody = `{
  "title": "Push Pull Legs",
  "notes": null,
  "days": [
    {
      "dayLabel": "Push",
      "exercises": [
        {
          "exerciseItemId": "{{exerciseItemId}}",
          "sets": 3,
          "reps": "8-12",
          "notes": null
        }
      ]
    }
  ]
}`;

const workoutPlanJson = `{
  "id": "${planId}",
  "clientUserId": "${clientUserId}",
  "trainerId": "${trainerId}",
  "gymOrgId": "${gymOrgId}",
  "title": "Push Pull Legs",
  "notes": null,
  "status": "ACTIVE",
  "writable": true,
  "completionDate": "2026-08-17",
  "days": [
    {
      "id": "${dayId}",
      "dayLabel": "Push",
      "exercises": [
        {
          "id": "${itemId}",
          "exerciseItemId": "${exerciseId}",
          "name": "Barbell Bench Press",
          "sets": 3,
          "reps": "8-12",
          "notes": null,
          "completed": false
        }
      ]
    }
  ],
  "clonedFromId": null,
  "createdAt": "2026-08-17T10:00:00.000Z",
  "updatedAt": "2026-08-17T10:00:00.000Z"
}`;

const staffPlanJson = workoutPlanJson
  .replace('"writable": true', '"writable": false')
  .replace('"completionDate": "2026-08-17"', '"completionDate": null')
  .replace(',\n          "completed": false', '');

function example(name, code, status, method, url, header, body, rawBody) {
  return {
    id: randomUUID(),
    name,
    originalRequest: {
      method,
      header,
      url,
      ...(rawBody
        ? { body: { mode: 'raw', raw: rawBody, options: { raw: { language: 'json' } } } }
        : {}),
    },
    status,
    code,
    _postman_previewlanguage: 'json',
    header: acceptHeader,
    cookie: [],
    responseTime: null,
    body,
  };
}

const searchUrl = {
  raw: '{{baseUrl}}/exercises/search?q=bench',
  host: ['{{baseUrl}}'],
  path: ['exercises', 'search'],
  query: [
    {
      key: 'q',
      value: 'bench',
      description: 'Search needle. Empty returns the bootstrap seed list (max 20). Example: `bench`.',
    },
  ],
};

const assignUrl = {
  raw: '{{baseUrl}}/gym-orgs/{{gymOrgId}}/clients/{{clientUserId}}/workout-plans',
  host: ['{{baseUrl}}'],
  path: ['gym-orgs', '{{gymOrgId}}', 'clients', '{{clientUserId}}', 'workout-plans'],
};

const myPlanUrl = {
  raw: '{{baseUrl}}/gym-orgs/{{gymOrgId}}/my-workout-plan',
  host: ['{{baseUrl}}'],
  path: ['gym-orgs', '{{gymOrgId}}', 'my-workout-plan'],
};

const completeUrl = {
  raw: '{{baseUrl}}/gym-orgs/{{gymOrgId}}/my-workout-plan/items/{{workoutPlanItemId}}/complete',
  host: ['{{baseUrl}}'],
  path: [
    'gym-orgs',
    '{{gymOrgId}}',
    'my-workout-plan',
    'items',
    '{{workoutPlanItemId}}',
    'complete',
  ],
};

const requests = [
  {
    name: 'Search Exercises',
    method: 'GET',
    header: acceptHeader,
    url: searchUrl,
    description: `**Story:** A trainer looks up a catalog movement so they can add it to a client's workout.

GET /exercises/search?q= — platform seed catalog (ADR-0007). Any authenticated user. Empty q returns the bootstrap list. Cap 20.

**Auth:** Bearer any lane
**Query:**
- \`q\` (optional, string) — Match name or aliases, max 120. Example: \`"bench"\`.

**Each exercise:**
- \`id\` (uuid) — ExerciseItem id. Example: \`{{exerciseItemId}}\`.
- \`name\` (string) — Movement (equipment). Example: \`"Barbell Bench Press"\`.
- \`aliases\` (string array) — Search synonyms.
- \`primaryMuscle\` (enum) — Values: CHEST, LATS, UPPER_BACK, LOWER_BACK, SHOULDERS, BICEPS, TRICEPS, QUADS, HAMSTRINGS, GLUTES, CALVES, CORE, FULL_BODY, CARDIO, OTHER.
- \`equipment\` (enum) — Values: BARBELL, DUMBBELL, MACHINE, CABLE, BODYWEIGHT, KETTLEBELL, BAND, OTHER.
- \`measurement\` (enum) — Values: WEIGHT_REPS, REPS_ONLY, DURATION, BODYWEIGHT_ASSISTED.

**Success \`200\`:** \`{ exercises }\`
**Errors:** \`401\` AUTHENTICATION_FAILED · \`422\` VALIDATION_ERROR
Guide: gym-backend \`docs/coaching.md\`.`,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "pm.test('Status is 200', function () {",
            '  pm.response.to.have.status(200);',
            '});',
            'const body = pm.response.json();',
            "pm.test('exercises array', function () {",
            "  pm.expect(body).to.have.property('exercises');",
            "  pm.expect(body.exercises).to.be.an('array');",
            '});',
            'if (pm.response.code === 200 && body.exercises && body.exercises[0]) {',
            "  pm.collectionVariables.set('exerciseItemId', body.exercises[0].id);",
            '}',
          ],
        },
      },
    ],
    response: [
      example(
        '200 OK — seed hits',
        200,
        'OK',
        'GET',
        searchUrl,
        acceptHeader,
        `{
  "exercises": [
    {
      "id": "${exerciseId}",
      "name": "Barbell Bench Press",
      "aliases": ["bench"],
      "primaryMuscle": "CHEST",
      "equipment": "BARBELL",
      "measurement": "WEIGHT_REPS"
    }
  ]
}`,
      ),
    ],
  },
  {
    name: 'Assign Workout Plan',
    method: 'POST',
    header: jsonHeaders,
    url: assignUrl,
    body: {
      mode: 'raw',
      raw: assignBody,
      options: { raw: { language: 'json' } },
    },
    description: `**Story:** A trainer (or admin acting as trainer) assigns a structured workout so the client knows what to do this week.

POST /gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans — archives the prior ACTIVE plan for that (client, gym). Lines are catalog ExerciseItem ids, never typed names. \`WORKOUT_PLANS\` grant is **not** required to author.

**Auth:** Bearer TRAINER (assigned) or ADMIN-as-Trainer at gym; client must have in-date \`TRAINER_COACHING\` addon
**Path:** \`gymOrgId\`, \`clientUserId\`

**Request body (JSON):**
- \`title\` (required, string) — 1–120 chars after trim. Example: \`"Push Pull Legs"\`.
- \`notes\` (optional, string or null) — Free-text, max 5000. Example: \`null\`.
- \`days\` (required, array, min 1) — Each day needs ≥1 exercise.
  - \`dayLabel\` (required, string) — 1–80 chars. Example: \`"Push"\`.
  - \`exercises[]\`:
    - \`exerciseItemId\` (required, uuid) — Live seed ExerciseItem.
    - \`sets\` (optional, integer) — 1–99. Example: \`3\`.
    - \`reps\` (optional, string) — Prescription, max 40. Example: \`"8-12"\`.
    - \`notes\` (optional, string or null) — Line notes.

**Success fields \`workoutPlan\`:**
- \`id\` / \`clientUserId\` / \`trainerId\` / \`gymOrgId\` (uuid)
- \`title\` / \`notes\` / \`status\` (\`ACTIVE\`)
- \`writable\` (boolean)
- \`completionDate\` (YYYY-MM-DD or null)
- \`days[]\` — \`id\`, \`dayLabel\`, \`exercises[]\` (\`id\`, \`exerciseItemId\`, \`sets\`, \`reps\`, \`notes\`)
- \`clonedFromId\` (uuid or null)
- \`createdAt\` / \`updatedAt\` (ISO)

**Success \`201\`:** \`{ workoutPlan }\`
**Errors:** \`403\` COACHING_FORBIDDEN · \`404\` NOT_FOUND · \`409\` COACHING_ADDON_REQUIRED · \`422\` INVALID_WORKOUT_PLAN / VALIDATION_ERROR
Guide: gym-backend \`docs/coaching.md\`.`,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "pm.test('Status is 201', function () {",
            '  pm.response.to.have.status(201);',
            '});',
            'const body = pm.response.json();',
            'if (pm.response.code === 201 && body.workoutPlan && body.workoutPlan.days && body.workoutPlan.days[0] && body.workoutPlan.days[0].exercises && body.workoutPlan.days[0].exercises[0]) {',
            "  pm.collectionVariables.set('workoutPlanItemId', body.workoutPlan.days[0].exercises[0].id);",
            '}',
          ],
        },
      },
    ],
    response: [
      example(
        '201 Created — workout assigned',
        201,
        'Created',
        'POST',
        assignUrl,
        jsonHeaders,
        `{ "workoutPlan": ${workoutPlanJson.replace('\n          "name": "Barbell Bench Press",', '').replace(',\n          "completed": false', '')} }`,
        assignBody,
      ),
      example(
        '409 — COACHING_ADDON_REQUIRED',
        409,
        'Conflict',
        'POST',
        assignUrl,
        jsonHeaders,
        `{
  "error": {
    "code": "COACHING_ADDON_REQUIRED",
    "message": "An in-date TRAINER_COACHING addon is required for diet plan changes"
  }
}`,
        assignBody,
      ),
    ],
  },
  {
    name: 'Get Staff Workout Plan',
    method: 'GET',
    header: acceptHeader,
    url: assignUrl,
    description: `**Story:** A trainer opens the workout they assigned so they can confirm the prescription.

GET /gym-orgs/:gymOrgId/clients/:clientUserId/workout-plans — definition only (no completed flags). Catalog \`name\` is included on each exercise.

**Auth:** Bearer TRAINER (assigned) or ADMIN-as-Trainer
**Path:** \`gymOrgId\`, \`clientUserId\`

**Success \`200\`:** \`{ workoutPlan }\` or \`workoutPlan: null\`. \`writable\` is false; \`completionDate\` is null.
**Errors:** \`403\` COACHING_FORBIDDEN · \`404\` NOT_FOUND
Guide: gym-backend \`docs/coaching.md\`.`,
    response: [
      example(
        '200 OK — definition',
        200,
        'OK',
        'GET',
        assignUrl,
        acceptHeader,
        `{ "workoutPlan": ${staffPlanJson} }`,
      ),
    ],
  },
  {
    name: 'Get My Workout Plan',
    method: 'GET',
    header: acceptHeader,
    url: myPlanUrl,
    description: `**Story:** A client opens the workout their trainer assigned and sees which exercises they already ticked today.

GET /gym-orgs/:gymOrgId/my-workout-plan — client plan plus today’s \`completed\` flags (gym timezone).

**Auth:** Bearer CLIENT with ACTIVE membership at gym
**Path:** \`gymOrgId\`

\`writable\` is false after addon expiry (history still returned). \`workoutPlan\` may be \`null\`.

**Success \`200\`:** \`{ workoutPlan }\` — exercises include \`completed\` (boolean) and catalog \`name\` for gym-local today.
**Errors:** \`403\` COACHING_FORBIDDEN
Guide: gym-backend \`docs/coaching.md\`.`,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "pm.test('Status is 200', function () {",
            '  pm.response.to.have.status(200);',
            '});',
            'const body = pm.response.json();',
            'if (pm.response.code === 200 && body.workoutPlan && body.workoutPlan.days && body.workoutPlan.days[0] && body.workoutPlan.days[0].exercises && body.workoutPlan.days[0].exercises[0]) {',
            "  pm.collectionVariables.set('workoutPlanItemId', body.workoutPlan.days[0].exercises[0].id);",
            '}',
          ],
        },
      },
    ],
    response: [
      example(
        '200 OK — my plan',
        200,
        'OK',
        'GET',
        myPlanUrl,
        acceptHeader,
        `{ "workoutPlan": ${workoutPlanJson} }`,
      ),
    ],
  },
  {
    name: 'Complete Workout Exercise',
    method: 'POST',
    header: acceptHeader,
    url: completeUrl,
    description: `**Story:** A client ticks a prescribed exercise as done for today.

POST /gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete — writes a PlanCompletion for gym-local today (not a set log).

**Auth:** Bearer CLIENT
**Path:**
- \`gymOrgId\` (uuid)
- \`itemId\` (uuid) — workout_plan_exercises.id. Example: \`{{workoutPlanItemId}}\`.

Second complete the same day → **409** \`ALREADY_COMPLETED_WORKOUT_EXERCISE\`. Expired addon → **409** \`COACHING_ADDON_REQUIRED\`.

**Success \`204\`:** empty body
**Errors:** \`403\` COACHING_FORBIDDEN · \`404\` NOT_FOUND · \`409\` ALREADY_COMPLETED_WORKOUT_EXERCISE / COACHING_ADDON_REQUIRED
Guide: gym-backend \`docs/coaching.md\`.`,
    response: [
      example('204 No Content', 204, 'No Content', 'POST', completeUrl, acceptHeader, ''),
      example(
        '409 — ALREADY_COMPLETED_WORKOUT_EXERCISE',
        409,
        'Conflict',
        'POST',
        completeUrl,
        acceptHeader,
        `{
  "error": {
    "code": "ALREADY_COMPLETED_WORKOUT_EXERCISE",
    "message": "This exercise is already completed for the day"
  }
}`,
      ),
    ],
  },
  {
    name: 'Uncomplete Workout Exercise',
    method: 'DELETE',
    header: acceptHeader,
    url: completeUrl,
    description: `**Story:** A client unticks an exercise they marked complete by mistake.

DELETE /gym-orgs/:gymOrgId/my-workout-plan/items/:itemId/complete — removes today’s PlanCompletion row.

**Auth:** Bearer CLIENT
**Path:** \`gymOrgId\`, \`itemId\` (\`{{workoutPlanItemId}}\`)

**Success \`204\`:** empty body
**Errors:** \`403\` COACHING_FORBIDDEN · \`404\` NOT_FOUND · \`409\` COACHING_ADDON_REQUIRED
Guide: gym-backend \`docs/coaching.md\`.`,
    response: [
      example('204 No Content', 204, 'No Content', 'DELETE', completeUrl, acceptHeader, ''),
    ],
  },
].map((row) => ({
  id: randomUUID(),
  name: row.name,
  ...(row.event ? { event: row.event } : {}),
  request: {
    method: row.method,
    header: row.header,
    url: row.url,
    ...(row.body ? { body: row.body } : {}),
    description: row.description,
  },
  response: row.response,
}));

const raw = JSON.parse(readFileSync(collectionPath, 'utf8'));
const coaching = raw.item.find((folder) => folder.name === 'Coaching');
if (!coaching) {
  throw new Error('Coaching folder not found');
}

coaching.description =
  'Diet plan assign / complete, gym diet templates (ADR-0008), and workout search/assign/complete (3.2, ADR-0007). Guides: gym-backend `docs/nutrition.md` and `docs/coaching.md`.';

const existing = new Set(coaching.item.map((row) => row.name));
for (const request of requests) {
  if (existing.has(request.name)) {
    console.log(`${request.name} already present`);
    continue;
  }
  coaching.item.push(request);
  console.log(`added ${request.name}`);
}

const vars = raw.variable ?? [];
function upsertVar(key, value, description) {
  const found = vars.find((row) => row.key === key);
  if (found) {
    return;
  }
  vars.push({ key, value, type: 'default', description });
}
upsertVar(
  'exerciseItemId',
  exerciseId,
  'Seed ExerciseItem id (Barbell Bench Press). Overwritten by Search Exercises.',
);
upsertVar(
  'workoutPlanItemId',
  '',
  'Set by Assign Workout Plan / Get My Workout Plan (prescribed line id).',
);
raw.variable = vars;

writeFileSync(collectionPath, `${JSON.stringify(raw, null, 2)}\n`);
console.log('wrote collection');
