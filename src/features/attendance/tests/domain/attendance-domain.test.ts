import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { Attendance } from '../../domain/attendance.entity';
import { toAttendanceId } from '../../domain/attendance-id';
import { assertCheckInAllowed } from '../../domain/check-in-eligibility';
import { CheckInNotAllowedError } from '../../domain/check-in-not-allowed.error';
import { InvalidAttendanceError } from '../../domain/invalid-attendance.error';
import { utcBoundsForGymLocalDay } from '../../infrastructure/gym-day-utc-bounds';

const now = new Date('2026-08-11T10:00:00.000Z');
const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const adminId = toUserId('22222222-2222-4222-8222-222222222222');

describe('Attendance entity', () => {
  it('creates CLIENT attendance when recorder equals client', () => {
    const attendance = Attendance.create({
      id: toAttendanceId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: clientId,
      gymOrgId,
      occurredAt: now,
      recordedBy: 'CLIENT',
      recorderUserId: clientId,
      now,
    });
    expect(attendance.recordedBy).toBe('CLIENT');
  });

  it('rejects CLIENT attendance when recorder differs', () => {
    expect(() =>
      Attendance.create({
        id: toAttendanceId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        clientUserId: clientId,
        gymOrgId,
        occurredAt: now,
        recordedBy: 'CLIENT',
        recorderUserId: adminId,
        now,
      }),
    ).toThrow(InvalidAttendanceError);
  });

  it('allows ADMIN desk mark with different recorder', () => {
    const attendance = Attendance.create({
      id: toAttendanceId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: clientId,
      gymOrgId,
      occurredAt: now,
      recordedBy: 'ADMIN',
      recorderUserId: adminId,
      now,
    });
    expect(attendance.recorderUserId).toBe(adminId);
  });
});

describe('assertCheckInAllowed', () => {
  const today = CalendarDate.create('2026-08-11');

  it('allows unstarted BASE and signals needsBaseStart', () => {
    const result = assertCheckInAllowed(
      {
        membershipId: 'm1',
        checkInBlocked: false,
        base: {
          subscriptionId: 's1',
          startDate: null,
          endDate: null,
        },
      },
      today,
    );
    expect(result.needsBaseStart).toBe(true);
    expect(result.subscriptionId).toBe('s1');
  });

  it('allows in-date BASE', () => {
    const result = assertCheckInAllowed(
      {
        membershipId: 'm1',
        checkInBlocked: false,
        base: {
          subscriptionId: 's1',
          startDate: CalendarDate.create('2026-08-01'),
          endDate: CalendarDate.create('2026-08-30'),
        },
      },
      today,
    );
    expect(result.needsBaseStart).toBe(false);
  });

  it('denies blocked, missing membership, expired base', () => {
    expect(() => assertCheckInAllowed(null, today)).toThrow(CheckInNotAllowedError);
    expect(() =>
      assertCheckInAllowed(
        {
          membershipId: 'm1',
          checkInBlocked: true,
          base: { subscriptionId: 's1', startDate: null, endDate: null },
        },
        today,
      ),
    ).toThrow(CheckInNotAllowedError);
    expect(() =>
      assertCheckInAllowed(
        {
          membershipId: 'm1',
          checkInBlocked: false,
          base: {
            subscriptionId: 's1',
            startDate: CalendarDate.create('2026-07-01'),
            endDate: CalendarDate.create('2026-07-30'),
          },
        },
        today,
      ),
    ).toThrow(CheckInNotAllowedError);
  });
});

describe('utcBoundsForGymLocalDay', () => {
  it('returns exclusive UTC window for Asia/Kolkata day', () => {
    const bounds = utcBoundsForGymLocalDay(CalendarDate.create('2026-08-11'), 'Asia/Kolkata');
    expect(bounds.endExclusive.getTime()).toBeGreaterThan(bounds.startInclusive.getTime());
    expect(bounds.endExclusive.getTime() - bounds.startInclusive.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });
});
