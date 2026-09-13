import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import type { Clock } from '../../../../shared/clock/clock';
import type { IdGenerator } from '../../../../shared/ids/id-generator';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { AttendanceAccessPolicy } from '../../application/attendance-access.policy';
import { AttendanceForbiddenError } from '../../application/attendance-forbidden.error';
import { DeskCheckOutUseCase } from '../../application/desk-check-out.use-case';
import { DeskMarkAttendanceUseCase } from '../../application/desk-mark-attendance.use-case';
import { ListPresentAttendancesUseCase } from '../../application/list-present-attendances.use-case';
import { SelfCheckInUseCase } from '../../application/self-check-in.use-case';
import { SelfCheckOutUseCase } from '../../application/self-check-out.use-case';
import { AlreadyCheckedInError } from '../../domain/already-checked-in.error';
import type { Attendance } from '../../domain/attendance.entity';
import type { AttendanceId } from '../../domain/attendance-id';
import type {
  AttendanceQueries,
  AttendanceSummary,
  ListClientAttendancesCriteria,
  ListGymDayAttendancesCriteria,
  ListPresentAttendancesCriteria,
} from '../../domain/attendance.queries';
import type { AttendanceRepository } from '../../domain/attendance.repository';
import type { BaseSubscriptionStarter } from '../../domain/base-subscription-starter.port';
import type {
  CheckInMembershipGate,
  CheckInMembershipSnapshot,
} from '../../domain/check-in-membership.gate';
import { CheckInNotAllowedError } from '../../domain/check-in-not-allowed.error';
import type { GymLocalClock, GymLocalDayBounds } from '../../domain/gym-local-clock.port';
import { NoOpenVisitError } from '../../domain/no-open-visit.error';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const adminId = toUserId('22222222-2222-4222-8222-222222222222');
const now = new Date('2026-08-11T04:30:00.000Z');

class FakeClock implements Clock {
  constructor(private current: Date = now) {}

  now(): Date {
    return this.current;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

class FakeIds implements IdGenerator {
  private n = 0;

  generate(): string {
    this.n += 1;
    return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${this.n}`;
  }
}

class InMemoryAttendances implements AttendanceRepository, AttendanceQueries {
  readonly saved: Attendance[] = [];

  async findById(_gymOrgId: typeof gymOrgId, id: AttendanceId): Promise<Attendance | null> {
    return this.saved.find((row) => row.id === id) ?? null;
  }

  async findOpenByClient(
    orgId: typeof gymOrgId,
    clientUserId: typeof clientId,
  ): Promise<Attendance | null> {
    return (
      this.saved.find(
        (row) => row.gymOrgId === orgId && row.clientUserId === clientUserId && row.isOpen,
      ) ?? null
    );
  }

  async save(attendance: Attendance): Promise<void> {
    const index = this.saved.findIndex((row) => row.id === attendance.id);
    if (index === -1) {
      this.saved.push(attendance);
      return;
    }
    this.saved[index] = attendance;
  }

  async listForGymDay(
    _criteria: ListGymDayAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>> {
    return { items: [], total: 0, limit: page.limit, offset: page.offset };
  }

  async listForClient(
    _criteria: ListClientAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>> {
    return { items: [], total: 0, limit: page.limit, offset: page.offset };
  }

  async listPresent(
    criteria: ListPresentAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>> {
    const items = this.saved
      .filter((row) => row.gymOrgId === criteria.gymOrgId && row.isOpen)
      .map((row) => ({
        id: row.id,
        clientUserId: row.clientUserId,
        gymOrgId: row.gymOrgId,
        occurredAt: row.occurredAt.toISOString(),
        recordedBy: row.recordedBy,
        recorderUserId: row.recorderUserId,
        checkedOutAt: row.checkedOutAt?.toISOString() ?? null,
        checkoutRecorderUserId: row.checkoutRecorderUserId,
        createdAt: row.createdAt.toISOString(),
      }));
    return { items, total: items.length, limit: page.limit, offset: page.offset };
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

function trainerActor(): AuthenticatedActor {
  return {
    userId: toUserId('33333333-3333-4333-8333-333333333333'),
    roleCode: 'TRAINER',
    lane: 'STAFF',
    email: 't@example.com',
    staffCode: 'TRN1',
  };
}

const inDateSnapshot: CheckInMembershipSnapshot = {
  membershipId: 'm1',
  checkInBlocked: false,
  base: {
    subscriptionId: 's1',
    startDate: CalendarDate.create('2026-08-01'),
    endDate: CalendarDate.create('2026-08-30'),
  },
};

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
    expect(result.checkedInAt).toBe(now.toISOString());
    expect(result.checkedOutAt).toBeNull();
    expect(result.durationSeconds).toBeNull();
    expect(result.baseStarted).toBe(true);
    expect(starter.started).toEqual(['s1']);
    expect(attendances.saved).toHaveLength(1);
  });

  it('rejects a second check-in while the visit is open', async () => {
    const useCase = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      starter,
      new FixedGymClock(),
      new FakeClock(),
      new FakeIds(),
    );
    await useCase.execute(clientActor(), gymOrgId);
    await expect(useCase.execute(clientActor(), gymOrgId)).rejects.toThrow(AlreadyCheckedInError);
  });

  it('allows a second check-in after check-out', async () => {
    const clock = new FakeClock();
    const checkIn = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      starter,
      new FixedGymClock(),
      clock,
      new FakeIds(),
    );
    const checkOut = new SelfCheckOutUseCase(policy, attendances, clock);

    await checkIn.execute(clientActor(), gymOrgId);
    clock.advance(60_000);
    await checkOut.execute(clientActor(), gymOrgId);
    const second = await checkIn.execute(clientActor(), gymOrgId);
    expect(second.checkedOutAt).toBeNull();
    expect(attendances.saved).toHaveLength(2);
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
      new FixedGate(inDateSnapshot),
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

describe('SelfCheckOutUseCase', () => {
  it('closes the open visit and returns duration', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => true },
    );
    const clock = new FakeClock();
    const checkIn = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      new RecordingStarter(),
      new FixedGymClock(),
      clock,
      new FakeIds(),
    );
    const checkOut = new SelfCheckOutUseCase(policy, attendances, clock);

    await checkIn.execute(clientActor(), gymOrgId);
    clock.advance(90_000);
    const result = await checkOut.execute(clientActor(), gymOrgId);
    expect(result.checkedOutAt).toBe(clock.now().toISOString());
    expect(result.durationSeconds).toBe(90);
    expect(result.checkoutRecorderUserId).toBe(clientId);
  });

  it('allows check-out when check-in is blocked', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => true },
    );
    const clock = new FakeClock();
    await new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      new RecordingStarter(),
      new FixedGymClock(),
      clock,
      new FakeIds(),
    ).execute(clientActor(), gymOrgId);

    const blockedCheckIn = new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate({
        membershipId: 'm1',
        checkInBlocked: true,
        base: inDateSnapshot.base,
      }),
      new RecordingStarter(),
      new FixedGymClock(),
      clock,
      new FakeIds(),
    );
    await expect(blockedCheckIn.execute(clientActor(), gymOrgId)).rejects.toThrow(
      CheckInNotAllowedError,
    );

    const result = await new SelfCheckOutUseCase(policy, attendances, clock).execute(
      clientActor(),
      gymOrgId,
    );
    expect(result.checkedOutAt).not.toBeNull();
  });

  it('rejects when there is no open visit', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => true },
    );
    await expect(
      new SelfCheckOutUseCase(policy, attendances, new FakeClock()).execute(
        clientActor(),
        gymOrgId,
      ),
    ).rejects.toThrow(NoOpenVisitError);
  });
});

describe('DeskCheckOutUseCase', () => {
  it('admin closes a client visit', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => false },
    );
    const clock = new FakeClock();
    await new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      new RecordingStarter(),
      new FixedGymClock(),
      clock,
      new FakeIds(),
    ).execute(clientActor(), gymOrgId);

    clock.advance(30_000);
    const result = await new DeskCheckOutUseCase(policy, attendances, clock).execute(adminActor(), {
      gymOrgId,
      clientUserId: clientId,
    });
    expect(result.checkoutRecorderUserId).toBe(adminId);
    expect(result.durationSeconds).toBe(30);
  });

  it('forbids trainer desk check-out', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => false },
      { isLiveTrainer: async () => true },
    );
    await expect(
      new DeskCheckOutUseCase(policy, attendances, new FakeClock()).execute(trainerActor(), {
        gymOrgId,
        clientUserId: clientId,
      }),
    ).rejects.toThrow(AttendanceForbiddenError);
  });
});

describe('ListPresentAttendancesUseCase', () => {
  it('lists only open visits with elapsed duration', async () => {
    const attendances = new InMemoryAttendances();
    const policy = new AttendanceAccessPolicy(
      { isLiveAdmin: async () => true },
      { isLiveTrainer: async () => false },
    );
    const clock = new FakeClock();
    await new SelfCheckInUseCase(
      policy,
      attendances,
      new FixedGate(inDateSnapshot),
      new RecordingStarter(),
      new FixedGymClock(),
      clock,
      new FakeIds(),
    ).execute(clientActor(), gymOrgId);
    clock.advance(45_000);

    const result = await new ListPresentAttendancesUseCase(policy, attendances, clock).execute(
      adminActor(),
      gymOrgId,
      { limit: 20, offset: 0 },
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.durationSeconds).toBe(45);
    expect(result.items[0]?.checkedOutAt).toBeNull();
  });
});
