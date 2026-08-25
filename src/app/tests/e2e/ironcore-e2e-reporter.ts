import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Reporter, SerializedError, TestModule, TestRunEndReason } from 'vitest/node';

import {
  FLOW_EXPECTATION_BY_ID,
  FLOW_EXPECTATIONS,
  parseFlowIdsFromTitle,
} from './flow-expectations';

export interface FlowReportRow {
  readonly flowId: string;
  readonly scenario: string;
  readonly expectedBehaviour: string;
  readonly result: 'PASS' | 'FAIL' | 'SKIP' | 'NOT_RUN';
  readonly actualBehaviour: string;
  readonly journey: string;
  readonly durationMs: number | null;
  readonly failureReason: string | null;
}

function journeyFromModuleId(moduleId: string): string {
  const base = path.basename(moduleId);
  const match = base.match(/journey-([a-z])-/);
  if (match?.[1] !== undefined) {
    return `Journey ${match[1].toUpperCase()}`;
  }
  return base;
}

function formatErrors(errors: ReadonlyArray<{ message?: string; name?: string }> | undefined): string {
  if (errors === undefined || errors.length === 0) {
    return 'Assertion failed';
  }
  return errors
    .map((error) => error.message?.split('\n')[0] ?? error.name ?? 'Error')
    .join('; ');
}

export default class IronCoreE2eReporter implements Reporter {
  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ): void {
    const rowsByFlow = new Map<string, FlowReportRow>();
    const runAt = new Date().toISOString();

    for (const testModule of testModules) {
      const journey = journeyFromModuleId(testModule.moduleId);
      for (const testCase of testModule.children.allTests()) {
        const title = testCase.name;
        const flowIds = parseFlowIdsFromTitle(title);
        const resultState = testCase.result().state;
        const diagnostic = testCase.diagnostic();
        const durationMs =
          diagnostic !== undefined ? Math.round(diagnostic.duration) : null;

        let result: FlowReportRow['result'] = 'NOT_RUN';
        let actualBehaviour: string;
        let failureReason: string | null = null;

        if (resultState === 'passed') {
          result = 'PASS';
          actualBehaviour = 'Matched expected behaviour (all assertions passed)';
        } else if (resultState === 'failed') {
          result = 'FAIL';
          const errors = testCase.result().errors;
          failureReason = formatErrors(errors);
          actualBehaviour = `Did not match expected behaviour: ${failureReason}`;
        } else if (resultState === 'skipped') {
          result = 'SKIP';
          actualBehaviour = 'Test skipped';
        } else {
          result = 'NOT_RUN';
          actualBehaviour = `Test ended as ${resultState}`;
        }

        const ids = flowIds.length > 0 ? flowIds : [`UNLABELED:${title}`];
        for (const flowId of ids) {
          const meta = FLOW_EXPECTATION_BY_ID.get(flowId);
          const existing = rowsByFlow.get(flowId);
          // Prefer FAIL over PASS if the same flow appears in multiple tests.
          if (existing !== undefined && existing.result === 'FAIL') {
            continue;
          }
          if (existing !== undefined && result === 'PASS' && existing.result === 'PASS') {
            continue;
          }
          rowsByFlow.set(flowId, {
            flowId,
            scenario: meta?.scenario ?? title,
            expectedBehaviour: meta?.expectedBehaviour ?? title,
            result,
            actualBehaviour,
            journey,
            durationMs,
            failureReason,
          });
        }
      }
    }

    // Catalogue flows that never appeared in this run stay visible as NOT_RUN.
    for (const flow of FLOW_EXPECTATIONS) {
      if (!rowsByFlow.has(flow.id)) {
        rowsByFlow.set(flow.id, {
          flowId: flow.id,
          scenario: flow.scenario,
          expectedBehaviour: flow.expectedBehaviour,
          result: 'NOT_RUN',
          actualBehaviour: 'Not exercised in this run',
          journey: '—',
          durationMs: null,
          failureReason: null,
        });
      }
    }

    const rows = [...rowsByFlow.values()].sort((a, b) => a.flowId.localeCompare(b.flowId));
    const passed = rows.filter((row) => row.result === 'PASS').length;
    const failed = rows.filter((row) => row.result === 'FAIL').length;
    const skipped = rows.filter((row) => row.result === 'SKIP').length;
    const notRun = rows.filter((row) => row.result === 'NOT_RUN').length;

    const outDir = path.join(process.cwd(), 'docs', 'e2e-reports');
    mkdirSync(outDir, { recursive: true });

    const stamp = runAt.replace(/[:.]/g, '-');
    const latestMd = path.join(outDir, 'latest.md');
    const latestJson = path.join(outDir, 'latest.json');
    const stampedMd = path.join(outDir, `report-${stamp}.md`);

    const markdown = renderMarkdown({
      runAt,
      reason,
      passed,
      failed,
      skipped,
      notRun,
      rows,
      unhandledErrors,
    });

    const payload = {
      runAt,
      reason,
      summary: { passed, failed, skipped, notRun, total: rows.length },
      unhandledErrors: unhandledErrors.map((error) => error.message ?? String(error)),
      flows: rows,
    };

    writeFileSync(latestMd, markdown, 'utf8');
    writeFileSync(stampedMd, markdown, 'utf8');
    writeFileSync(latestJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    // Console summary so the terminal shows the report path immediately.
    const lines = [
      '',
      '── IronCore E2E flow report ─────────────────────────────',
      `  Result: ${reason}  |  PASS ${passed}  FAIL ${failed}  SKIP ${skipped}  NOT_RUN ${notRun}`,
      `  Written: ${path.relative(process.cwd(), latestMd)}`,
      '────────────────────────────────────────────────────────',
    ];
    for (const row of rows.filter((item) => item.result === 'FAIL')) {
      lines.push(`  ✗ ${row.flowId}: ${row.failureReason}`);
    }
    console.log(lines.join('\n'));
  }
}

function renderMarkdown(input: {
  readonly runAt: string;
  readonly reason: TestRunEndReason;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly notRun: number;
  readonly rows: ReadonlyArray<FlowReportRow>;
  readonly unhandledErrors: ReadonlyArray<SerializedError>;
}): string {
  const lines: string[] = [
    '# IronCore E2E flow report',
    '',
    `Generated: \`${input.runAt}\``,
    '',
    `Run status: **${input.reason}**`,
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| PASS | ${input.passed} |`,
    `| FAIL | ${input.failed} |`,
    `| SKIP | ${input.skipped} |`,
    `| NOT_RUN | ${input.notRun} |`,
    `| Total flow IDs | ${input.rows.length} |`,
    '',
    '## Flows',
    '',
    '| Flow ID | Result | Journey | Expected app behaviour | Actual app behaviour |',
    '|---------|--------|---------|------------------------|----------------------|',
  ];

  for (const row of input.rows) {
    lines.push(
      `| ${row.flowId} | ${row.result} | ${row.journey} | ${escapeCell(row.expectedBehaviour)} | ${escapeCell(row.actualBehaviour)} |`,
    );
  }

  const failures = input.rows.filter((row) => row.result === 'FAIL');
  if (failures.length > 0) {
    lines.push('', '## Failures (product gaps)', '');
    for (const row of failures) {
      lines.push(`### ${row.flowId} — ${row.scenario}`, '');
      lines.push(`- **Expected:** ${row.expectedBehaviour}`);
      lines.push(`- **Actual:** ${row.actualBehaviour}`);
      if (row.failureReason !== null) {
        lines.push(`- **Failure:** \`${row.failureReason}\``);
      }
      lines.push('');
    }
  }

  if (input.unhandledErrors.length > 0) {
    lines.push('', '## Unhandled errors', '');
    for (const error of input.unhandledErrors) {
      lines.push(`- ${error.message ?? String(error)}`);
    }
    lines.push('');
  }

  lines.push(
    '',
    '## How to read this',
    '',
    '- **PASS** — the app behaved as the business rule requires (assertions held).',
    '- **FAIL** — the app behaved differently; treat as a product/flow gap.',
    '- **NOT_RUN** — Flow ID is in the catalogue but was not exercised in this run.',
    '',
    'Machine-readable twin: [`latest.json`](./latest.json).',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
