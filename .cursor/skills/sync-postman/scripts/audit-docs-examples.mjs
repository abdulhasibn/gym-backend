#!/usr/bin/env node
/**
 * Audit Postman collection for property Docs + Examples coverage.
 * Usage: node audit-docs-examples.mjs [path-to-collection.json]
 * Exit 0 if pass, 1 if gaps.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const defaultPath = resolve(
  __dir,
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);
const inputPath = resolve(process.argv[2] ?? defaultPath);

if (!existsSync(inputPath)) {
  console.error(`Collection not found: ${inputPath}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const gaps = [];

function walk(items, folder = '') {
  for (const it of items ?? []) {
    if (it.item && !it.request) {
      const next = folder ? `${folder}/${it.name}` : it.name;
      walk(it.item, next);
      continue;
    }
    if (!it.request) continue;

    const path = folder ? `${folder} / ${it.name}` : it.name;
    const desc = it.request.description ?? '';
    const examples = it.response ?? [];
    const method = (it.request.method ?? '').toUpperCase();

    if (!desc.trim()) {
      gaps.push({ path, kind: 'docs', detail: 'empty description' });
    } else if (desc.includes('|---|') || desc.includes('| --- |')) {
      gaps.push({ path, kind: 'docs', detail: 'markdown table (|---|) — use bullet lists' });
    } else if (desc.length < 40) {
      gaps.push({ path, kind: 'docs', detail: `description too thin (${desc.length} chars)` });
    }

    if (examples.length === 0) {
      gaps.push({ path, kind: 'examples', detail: 'no saved Examples' });
    } else {
      const isNegative = folder.includes('Negative');
      const isNoContent = examples.every((e) => e.code === 204 || e.code === 302);
      const mutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
      const hasSuccess = examples.some((e) => e.code >= 200 && e.code < 300);
      const hasError = examples.some((e) => e.code >= 400);

      if (!isNegative && !isNoContent && mutating && method !== 'DELETE' && hasSuccess && !hasError) {
        gaps.push({
          path,
          kind: 'examples',
          detail: 'mutating request missing error Example (prefer success + 4xx)',
        });
      }
      if (!isNegative && !hasSuccess && !isNoContent) {
        gaps.push({ path, kind: 'examples', detail: 'missing success Example' });
      }
    }
  }
}

walk(raw.item ?? []);

const byKind = { docs: [], examples: [] };
for (const g of gaps) byKind[g.kind]?.push(g);

console.log(
  JSON.stringify(
    {
      collection: inputPath,
      gapCount: gaps.length,
      docsGaps: byKind.docs.length,
      exampleGaps: byKind.examples.length,
      gaps,
    },
    null,
    2,
  ),
);

process.exit(gaps.length === 0 ? 0 : 1);
