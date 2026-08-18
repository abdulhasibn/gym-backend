#!/usr/bin/env node
/**
 * Restore/sync collection via Postman API.
 * Auth: POSTMAN_API_KEY env, or Bearer token from ~/.cursor/mcp.json (postman_mcp_server).
 * Usage: node run-put-collection.mjs [/tmp/gym-backend-postman-put.json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function resolveApiKey() {
  if (process.env.POSTMAN_API_KEY) return process.env.POSTMAN_API_KEY;
  const mcpPath = join(homedir(), '.cursor/mcp.json');
  if (!existsSync(mcpPath)) return null;
  const raw = readFileSync(mcpPath, 'utf8');
  const match = raw.match(/Bearer (PMAK-[^\s"']+)/);
  return match?.[1] ?? null;
}

const apiKey = resolveApiKey();
if (!apiKey) {
  console.error('Postman API key not found (POSTMAN_API_KEY or ~/.cursor/mcp.json)');
  process.exit(1);
}

const inputPath = process.argv[2] ?? '/tmp/gym-backend-postman-put.json';
const payload = JSON.parse(readFileSync(inputPath, 'utf8'));

const res = await fetch(
  `https://api.getpostman.com/collections/${payload.collectionId}`,
  {
    method: 'PUT',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      Prefer: payload.Prefer ?? 'respond-async',
    },
    body: JSON.stringify({ collection: payload.collection }),
  },
);

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(JSON.stringify({ status: res.status, body }, null, 2));
if (!res.ok && res.status !== 202) process.exit(1);

if (res.status === 202 && body?.task?.id) {
  const taskId = body.task.id;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(
      `https://api.getpostman.com/collection-updates-tasks/${taskId}`,
      { headers: { 'X-Api-Key': apiKey } },
    );
    const pollBody = await poll.json();
    console.log('poll', JSON.stringify(pollBody));
    if (pollBody?.task?.status === 'completed' || pollBody?.task?.status === 'successful' || pollBody?.status === 'successful') {
      process.exit(pollBody?.task?.status === 'failed' ? 1 : 0);
    }
  }
}
