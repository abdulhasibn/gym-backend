import { describe, expect, it } from 'vitest';

import { toWorkoutScheduleDaySummary } from '../../infrastructure/coaching.mapper';
import type { ScheduleDayWithSessions } from '../../infrastructure/coaching.mapper';

function makeScheduleDayRow(scheduleDate: string): ScheduleDayWithSessions {
  return {
    id: 'd0000000-0000-4000-8000-000000000001',
    client_user_id: '11111111-1111-4111-8111-111111111111',
    gym_org_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    trainer_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    schedule_date: scheduleDate,
    kind: 'REST',
    deleted_at: null,
    created_at: '2026-09-07T10:00:00.000Z',
    updated_at: '2026-09-07T10:00:00.000Z',
    workout_schedule_sessions: [],
  } as ScheduleDayWithSessions;
}

// ─── G10: scheduleDate normalization ─────────────────────────────────────────

describe('toWorkoutScheduleDaySummary — scheduleDate normalization (G10)', () => {
  it('returns YYYY-MM-DD when the driver yields a plain date string', () => {
    const summary = toWorkoutScheduleDaySummary(makeScheduleDayRow('2026-09-07'));
    expect(summary.scheduleDate).toBe('2026-09-07');
    expect(summary.scheduleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('strips the time portion when the driver yields an ISO datetime', () => {
    const summary = toWorkoutScheduleDaySummary(makeScheduleDayRow('2026-09-07T00:00:00.000Z'));
    expect(summary.scheduleDate).toBe('2026-09-07');
  });

  it('handles UTC midnight without shifting the date', () => {
    const summary = toWorkoutScheduleDaySummary(makeScheduleDayRow('2026-01-01T00:00:00Z'));
    expect(summary.scheduleDate).toBe('2026-01-01');
  });
});
