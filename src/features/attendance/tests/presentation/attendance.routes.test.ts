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
import { AttendanceAccessPolicy } from '../../application/attendance-access.policy';
import { DeskMarkAttendanceUseCase } from '../../application/desk-mark-attendance.use-case';
import { ListClientAttendancesUseCase } from '../../application/list-client-attendances.use-case';
import { ListGymDayAttendancesUseCase } from '../../application/list-gym-day-attendances.use-case';
import { ListMyAttendancesUseCase } from '../../application/list-my-attendances.use-case';
import { SelfCheckInUseCase } from '../../application/self-check-in.use-case';
import type { Attendance } from '../../domain/attendance.entity';
import type {
  AttendanceQueries,
  AttendanceSummary,
  ListClientAttendancesCriteria,
  ListGymDayAttendancesCriteria,
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
import type { Page, Pagination } from '../../../../shared/pagination/pagination';

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

  async findById(): Promise<Attendance | null> {
    return null;
  }

  async save(attendance: Attendance): Promise<void> {
    this.rows.push(attendance);
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
    new DeskMarkAttendanceUseCase(
      policy,
      store,
      gate,
      { startFromFirstAttendance: async () => {} },
      gymClock,
      clock,
      ids,
    ),
    new ListGymDayAttendancesUseCase(policy, store, gymClock, clock),
    new ListClientAttendancesUseCase(policy, store),
    new ListMyAttendancesUseCase(policy, store),
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

describe('attendance routes', () => {
  it('POST check-in as client returns 201', async () => {
    const { app, store } = createApp({
      userId: toUserId(clientUserId),
      roleCode: 'CLIENT',
      lane: 'CLIENT',
      email: 'c@example.com',
      staffCode: null,
    });
    const res = await request(app).post(`/gym-orgs/${gymOrgId}/attendances/check-in`);
    expect(res.status).toBe(201);
    expect(res.body.attendance.recordedBy).toBe('CLIENT');
    expect(store.rows).toHaveLength(1);
  });

  it('POST desk-mark as admin returns 201', async () => {
    const { app } = createApp({
      userId: toUserId(adminUserId),
      roleCode: 'ADMIN',
      lane: 'STAFF',
      email: 'a@example.com',
      staffCode: 'ADM1',
    });
    const res = await request(app)
      .post(`/gym-orgs/${gymOrgId}/attendances/desk-mark`)
      .send({ clientUserId });
    expect(res.status).toBe(201);
    expect(res.body.attendance.recordedBy).toBe('ADMIN');
  });

  it('GET gym day as admin returns 200', async () => {
    const { app } = createApp({
      userId: toUserId(adminUserId),
      roleCode: 'ADMIN',
      lane: 'STAFF',
      email: 'a@example.com',
      staffCode: 'ADM1',
    });
    const res = await request(app).get(`/gym-orgs/${gymOrgId}/attendances`);
    expect(res.status).toBe(200);
    expect(res.body.attendances.items).toEqual([]);
  });
});
