#!/usr/bin/env node
/**
 * Build putCollection payload from gym-backend-postman export.
 * Usage: node prepare-put.mjs [path-to-collection.json]
 * Writes: /tmp/gym-backend-postman-put.json
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COLLECTION_UID = '25800783-a442e881-b024-4178-89ad-accb66ac1d58';
const __dir = dirname(fileURLToPath(import.meta.url));
// scripts → sync-postman → skills → .cursor → gymBackend → sibling repo
const defaultPath = resolve(
  __dir,
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);
const inputPath = resolve(process.argv[2] ?? defaultPath);
const outPath = '/tmp/gym-backend-postman-put.json';

if (!existsSync(inputPath)) {
  console.error(`Collection not found: ${inputPath}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));

function transform(node, markItem) {
  if (Array.isArray(node)) return node.map((n) => transform(n, true));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'id' || k === 'uid' || k === '_postman_id') continue;
      if (k === 'createdAt' || k === 'updatedAt' || k === 'createdat' || k === 'lastUpdatedBy') {
        continue;
      }
      out[k] = transform(v, k === 'item');
    }
    if (markItem && out.name != null && (out.item != null || out.request != null)) {
      out.id = randomUUID();
    }
    return out;
  }
  return node;
}

const collection = {
  info: {
    name: raw.info.name,
    description: raw.info.description,
    schema: raw.info.schema,
  },
  auth: transform(raw.auth, false),
  event: transform(raw.event, false),
  variable: transform(raw.variable, false),
  item: transform(raw.item, true),
};

const payload = {
  collectionId: COLLECTION_UID,
  Prefer: 'respond-async',
  collection,
};

writeFileSync(outPath, JSON.stringify(payload));
const folders = collection.item.map((i) => ({
  name: i.name,
  requests: (i.item ?? []).filter((c) => c.request).map((c) => c.name),
}));
console.log(
  JSON.stringify(
    {
      outPath,
      bytes: Buffer.byteLength(JSON.stringify(payload)),
      folders,
    },
    null,
    2,
  ),
);
