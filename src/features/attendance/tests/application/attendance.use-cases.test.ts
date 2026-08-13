import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import type { Clock } from '../../../../shared/clock/clock';
import type { IdGenerator } from '../../../../shared/ids/id-generator';
import { AttendanceAccessPolicy } from '../../application/attendance-access.policy';
import { DeskMarkAttendanceUseCase } from '../../application/desk-mark-attendance.use-case';
import { SelfCheckInUseCase } from '../../application/self-check-in.use-case';
import type { Attendance } from '../../domain/attendance.entity';
import type { AttendanceId } from '../../domain/attendance-id';
import type { AttendanceRepository } from '../../domain/attendance.repository';
import type { BaseSubscriptionStarter } from '../../domain/base-subscription-starter.port';
import type {
  CheckInMembershipGate,
  CheckInMembershipSnapshot,
} from '../../domain/check-in-membership.gate';
import { CheckInNotAllowedError } from '../../domain/check-in-not-allowed.error';
import type { GymLocalClock, GymLocalDayBounds } from '../../domain/gym-local-clock.port';
import { AttendanceForbiddenError } from '../../application/attendance-forbidden.error';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const adminId = toUserId('22222222-2222-4222-8222-222222222222');
const now = new Date('2026-08-11T04:30:00.000Z');

class FakeClock implements Clock {
  now(): Date {
    return now;
  }
}

class FakeIds implements IdGenerator {
  generate(): string {
    return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  }
}

class InMemoryAttendances implements AttendanceRepository {
  readonly saved: Attendance[] = [];

  async findById(_gymOrgId: typeof gymOrgId, _id: AttendanceId): Promise<Attendance | null> {
    return null;
  }

  async save(attendance: Attendance): Promise<void> {
    this.saved.push(attendance);
  }
}

class FixedGate implements CheckInMembershipGate {
  constructor(private snapshot: CheckInMembershipSnapshot | null) {}

  async loadActive(): Promise<CheckInMembershipSnapshot | null> {
    return this.snapshot;
  }
}

class RecordingStarter implements BaseSubscriptionStarter {
  started: string[] = [];

  async startFromFirstAttendance(
    _gymOrgId: typeof gymOrgId,
    subscriptionId: string,
  ): Promise<void> {
    this.started.push(subscriptionId);
  }
}

class FixedGymClock implements GymLocalClock {
  async today(): Promise<CalendarDate> {
    return CalendarDate.create('2026-08-11');
  }

  async dayBounds(): Promise<GymLocalDayBounds> {
    return {
      startInclusive: new Date('2026-08-10T18:30:00.000Z'),
      endExclusive: new Date('2026-08-11T18:30:00.000Z'),
    };
  }
}

function clientActor(): AuthenticatedActor {
  return {
    userId: clientId,
    roleCode: 'CLIENT',
    lane: 'CLIENT',
    email: 'c@example.com',
    staffCode: null,
  };
}

function adminActor(): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode: 'ADMIN',
    lane: 'STAFF',
    email: 'a@example.com',
    staffCode: 'ADM1',
  };
}

describe('SelfCheckInUseCase', () => {
  let attendances: InMemoryAttendances;
  let starter: RecordingStarter;
  let policy: AttendanceAccessPolicy;

  beforeEach(() => {
    attendances = new InMemoryAttendances();
    starter = new RecordingStarter();
    policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => true },
    );
  });

  it('checks in and starts unstarted BASE', async () => {
    const useCase = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate({
        membershipId: 'm1',
        checkInBlocked: false,
        base: { subscriptionId: 's1', startDate: null, endDate: null },
      }),
      starter,
      new FixedGymClock(),
      new FakeClock(),
      new FakeIds(),
    );

    const result = await useCase.execute(clientActor(), gymOrgId);
    expect(result.recordedBy).toBe('CLIENT');
    expect(result.baseStarted).toBe(true);
    expect(starter.started).toEqual(['s1']);
    expect(attendances.saved).toHaveLength(1);
  });

  it('rejects blocked check-in', async () => {
    const useCase = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate({
        membershipId: 'm1',
        checkInBlocked: true,
        base: { subscriptionId: 's1', startDate: null, endDate: null },
      }),
      starter,
      new FixedGymClock(),
      new FakeClock(),
      new FakeIds(),
    );

    await expect(useCase.execute(clientActor(), gymOrgId)).rejects.toThrow(CheckInNotAllowedError);
  });

  it('rejects non-client actor', async () => {
    const useCase = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(null),
      starter,
      new FixedGymClock(),
      new FakeClock(),
      new FakeIds(),
    );
    await expect(useCase.execute(adminActor(), gymOrgId)).rejects.toThrow(AttendanceForbiddenError);
  });
});

describe('DeskMarkAttendanceUseCase', () => {
  it('admin desk-marks with recordedBy ADMIN', async () => {
    const attendances = new InMemoryAttendances();
    const starter = new RecordingStarter();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => false },
    );
    const useCase = new DeskMarkAttendanceUseCase(
      policy,
      attendances,
      new FixedGate({
        membershipId: 'm1',
        checkInBlocked: false,
        base: {
          subscriptionId: 's1',
          startDate: CalendarDate.create('2026-08-01'),
          endDate: CalendarDate.create('2026-08-30'),
        },
      }),
      starter,
      new FixedGymClock(),
      new FakeClock(),
      new FakeIds(),
    );

    const result = await useCase.execute(adminActor(), {
      gymOrgId,
      clientUserId: clientId,
    });
    expect(result.recordedBy).toBe('ADMIN');
    expect(result.baseStarted).toBe(false);
    expect(starter.started).toHaveLength(0);
  });
});
