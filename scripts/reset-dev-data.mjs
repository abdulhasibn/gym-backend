#!/usr/bin/env node
/**
 * Wipe all public table data + auth.users on the linked Supabase project,
 * then re-seed frozen roles / role_permissions.
 *
 * Intended for early-stage / daily local smoke resets — not production customers.
 *
 * Required env (.env):
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_PROJECT_REF   — defaults to igcmptpjmagzwoccxcnw
 *
 * Usage:
 *   pnpm db:reset-data -- --yes
 *   pnpm db:reset-data -- --yes --dry-run   # print counts only
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'igcmptpjmagzwoccxcnw';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const args = new Set(process.argv.slice(2));
const yes = args.has('--yes') || args.has('-y');
const dryRun = args.has('--dry-run');

if (accessToken === undefined || accessToken.trim() === '') {
  console.error('Missing required env: SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), 'sql', 'reset-dev-data.sql');
const resetSql = readFileSync(sqlPath, 'utf8');

async function runQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    throw new Error(`SQL failed (${response.status}): ${detail}`);
  }

  return body;
}

const countsSql = `
SELECT 'auth.users' AS src, count(*)::int AS n FROM auth.users
UNION ALL SELECT 'public.users', count(*)::int FROM public.users
UNION ALL SELECT 'public.gym_orgs', count(*)::int FROM public.gym_orgs
UNION ALL SELECT 'public.client_profiles', count(*)::int FROM public.client_profiles
UNION ALL SELECT 'public.roles', count(*)::int FROM public.roles
UNION ALL SELECT 'public.role_permissions', count(*)::int FROM public.role_permissions
UNION ALL SELECT 'public.food_items', count(*)::int FROM public.food_items
UNION ALL SELECT 'public.food_item_servings', count(*)::int FROM public.food_item_servings
UNION ALL SELECT 'public.exercise_items', count(*)::int FROM public.exercise_items
ORDER BY 1;
`;

function printCounts(label, rows) {
  console.log(`\n${label}`);
  for (const row of rows ?? []) {
    console.log(`  ${row.src.padEnd(28)} ${row.n}`);
  }
}

console.log(`Project: ${projectRef}`);
console.log(`SQL:     ${sqlPath}`);

const before = await runQuery(countsSql);
printCounts('Before', before);

if (dryRun) {
  console.log('\nDry run — no changes made.');
  process.exit(0);
}

if (!yes) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `\nThis DELETES all auth users and public data on ${projectRef}, then re-seeds roles.\nType RESET to continue: `,
  );
  rl.close();
  if (answer.trim() !== 'RESET') {
    console.error('Aborted.');
    process.exit(1);
  }
}

await runQuery(resetSql);
const after = await runQuery(countsSql);
printCounts('After', after);

const roles = after?.find((r) => r.src === 'public.roles')?.n;
const perms = after?.find((r) => r.src === 'public.role_permissions')?.n;
const authUsers = after?.find((r) => r.src === 'auth.users')?.n;
const foods = after?.find((r) => r.src === 'public.food_items')?.n;
const servings = after?.find((r) => r.src === 'public.food_item_servings')?.n;
const exercises = after?.find((r) => r.src === 'public.exercise_items')?.n;

if (
  authUsers !== 0 ||
  roles !== 4 ||
  perms !== 29 ||
  foods !== 20 ||
  servings !== 160 ||
  exercises !== 30
) {
  console.error('\nReset finished but counts look unexpected. Check the After table.');
  process.exit(1);
}

console.log(
  '\nClean slate ready — roles 4 · permissions 29 · foods 20 · servings 160 · exercises 30 · auth.users 0',
);
