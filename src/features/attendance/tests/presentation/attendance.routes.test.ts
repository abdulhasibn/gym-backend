import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { AttendanceAccessPolicy } from '../../application/attendance-access.policy';
import { DeskCheckOutUseCase } from '../../application/desk-check-out.use-case';
import { DeskMarkAttendanceUseCase } from '../../application/desk-mark-attendance.use-case';
import { ListClientAttendancesUseCase } from '../../application/list-client-attendances.use-case';
import { ListGymDayAttendancesUseCase } from '../../application/list-gym-day-attendances.use-case';
import { ListMyAttendancesUseCase } from '../../application/list-my-attendances.use-case';
import { ListPresentAttendancesUseCase } from '../../application/list-present-attendances.use-case';
import { SelfCheckInUseCase } from '../../application/self-check-in.use-case';
import { SelfCheckOutUseCase } from '../../application/self-check-out.use-case';
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
import type { CheckInMembershipGate } from '../../domain/check-in-membership.gate';
import type { GymLocalClock, GymLocalDayBounds } from '../../domain/gym-local-clock.port';
import { AttendanceController } from '../../presentation/attendance.controller';
import { mapAttendanceError } from '../../presentation/attendance.error-mapper';
import {
  createAttendanceRouter,
  createMyAttendancesRouter,
} from '../../presentation/attendance.routes';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const gymOrgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const clientUserId = '11111111-1111-4111-8111-111111111111';
const adminUserId = '22222222-2222-4222-8222-222222222222';

class InMemoryAttendances implements AttendanceRepository, AttendanceQueries {
  readonly rows: Attendance[] = [];

  async findById(
    _gymOrgId: ReturnType<typeof toGymOrgId>,
    id: AttendanceId,
  ): Promise<Attendance | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }

  async findOpenByClient(
    orgId: ReturnType<typeof toGymOrgId>,
    clientId: ReturnType<typeof toUserId>,
  ): Promise<Attendance | null> {
    return (
      this.rows.find(
        (row) => row.gymOrgId === orgId && row.clientUserId === clientId && row.isOpen,
      ) ?? null
    );
  }

  async save(attendance: Attendance): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === attendance.id);
    if (index === -1) {
      this.rows.push(attendance);
      return;
    }
    this.rows[index] = attendance;
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
    const items = this.rows
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

function createApp(actor: AuthenticatedActor) {
  const store = new InMemoryAttendances();
  const policy = new AttendanceAccessPolicy(
    {
      isLiveAdmin: async (userId, orgId) =>
        userId === toUserId(adminUserId) && orgId === toGymOrgId(gymOrgId),
    },
    { isLiveTrainer: async () => false },
  );
  const gate: CheckInMembershipGate = {
    async loadActive() {
      return {
        membershipId: 'm1',
        checkInBlocked: false,
        base: {
          subscriptionId: 's1',
          startDate: CalendarDate.create('2026-08-01'),
          endDate: CalendarDate.create('2026-08-30'),
        },
      };
    },
  };
  const gymClock: GymLocalClock = {
    async today() {
      return CalendarDate.create('2026-08-11');
    },
    async dayBounds(): Promise<GymLocalDayBounds> {
      return {
        startInclusive: new Date('2026-08-10T18:30:00.000Z'),
        endExclusive: new Date('2026-08-11T18:30:00.000Z'),
      };
    },
  };
  const clock = { now: () => new Date('2026-08-11T10:00:00.000Z') };
  const ids = { generate: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };

  const controller = new AttendanceController(
    new SelfCheckInUseCase(
      policy,
      store,
      gate,
      { startFromFirstAttendance: async () => {} },
      gymClock,
      clock,
      ids,
    ),
    new SelfCheckOutUseCase(policy, store, clock),
    new DeskMarkAttendanceUseCase(
      policy,
      store,
      gate,
      { startFromFirstAttendance: async () => {} },
      gymClock,
      clock,
      ids,
    ),
    new DeskCheckOutUseCase(policy, store, clock),
    new ListGymDayAttendancesUseCase(policy, store, gymClock, clock),
    new ListClientAttendancesUseCase(policy, store),
    new ListMyAttendancesUseCase(policy, store),
    new ListPresentAttendancesUseCase(policy, store, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, actor);
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(`/gym-orgs/:gymOrgId/attendances`, createAttendanceRouter(controller, authenticate));
  app.use(
    `/gym-orgs/:gymOrgId/my-attendances`,
    createMyAttendancesRouter(controller, authenticate),
  );
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapAttendanceError]));
  return { app, store };
}

const clientActor: AuthenticatedActor = {
  userId: toUserId(clientUserId),
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

const adminActor: AuthenticatedActor = {
  userId: toUserId(adminUserId),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'a@example.com',
  staffCode: 'ADM1',
};

describe('attendance routes', () => {
  it('POST check-in as client returns 201', async () => {
    const { app, store } = createApp(clientActor);
    const res = await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-in`);
    expect(res.status).toBe(201);
    expect(res.body.attendance.recordedBy).toBe('CLIENT');
    expect(res.body.attendance.checkedInAt).toBeDefined();
    expect(res.body.attendance.checkedOutAt).toBeNull();
    expect(store.rows).toHaveLength(1);
  });

  it('POST check-in twice while open returns 409', async () => {
    const { app } = createApp(clientActor);
    await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-in`).expect(201);
    const res = await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-in`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CHECKED_IN');
  });

  it('POST check-out as client returns 200', async () => {
    const { app } = createApp(clientActor);
    await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-in`).expect(201);
    const res = await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-out`);
    expect(res.status).toBe(200);
    expect(res.body.attendance.checkedOutAt).toBeDefined();
    expect(res.body.attendance.durationSeconds).toBe(0);
  });

  it('POST desk-mark as admin returns 201', async () => {
    const { app } = createApp(adminActor);
    const res = await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .send({ clientUserId });
    expect(res.status).toBe(201);
    expect(res.body.attendance.recordedBy).toBe('ADMIN');
  });

  it('POST desk-check-out as admin returns 200', async () => {
    const { app } = createApp(adminActor);
    await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .send({ clientUserId })
      .expect(201);
    const res = await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-check-out`)
      .send({ clientUserId });
    expect(res.status).toBe(200);
    expect(res.body.attendance.checkoutRecorderUserId).toBe(adminUserId);
  });

  it('POST desk-check-out as client returns 403', async () => {
    const { app } = createApp(clientActor);
    const res = await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-check-out`)
      .send({ clientUserId });
    expect(res.status).toBe(403);
  });

  it('GET present as admin returns open visits', async () => {
    const { app } = createApp(adminActor);
    await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .send({ clientUserId })
      .expect(201);
    const res = await request(app).get(`/gym-orgs/${gymOrgId}/attendances/present`);
    expect(res.status).toBe(200);
    expect(res.body.attendances.total).toBe(1);
    expect(res.body.attendances.items[0].checkedOutAt).toBeNull();
  });

  it('GET gym day as admin returns 200', async () => {
    const { app } = createApp(adminActor);
    const res = await request(app).get(`/gym-orgs/${gymOrgId}/attendances`);
    expect(res.status).toBe(200);
    expect(res.body.attendances.items).toEqual([]);
  });
});
