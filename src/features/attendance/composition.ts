import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AttendanceAccessPolicy } from './application/attendance-access.policy';
import { DeskMarkAttendanceUseCase } from './application/desk-mark-attendance.use-case';
import { ListClientAttendancesUseCase } from './application/list-client-attendances.use-case';
import { ListGymDayAttendancesUseCase } from './application/list-gym-day-attendances.use-case';
import { ListMyAttendancesUseCase } from './application/list-my-attendances.use-case';
import { SelfCheckInUseCase } from './application/self-check-in.use-case';
import type { BaseSubscriptionStarter } from './domain/base-subscription-starter.port';
import type { CheckInMembershipGate } from './domain/check-in-membership.gate';
import type { GymLocalClock } from './domain/gym-local-clock.port';
import type { LiveGymAdminPort } from './domain/live-gym-admin.port';
import type { LiveTrainerPort } from './domain/live-trainer.port';
import { SupabaseAttendanceQueries } from './infrastructure/supabase-attendance.queries';
import { SupabaseAttendanceRepository } from './infrastructure/supabase-attendance.repository';
import { AttendanceController } from './presentation/attendance.controller';
import { mapAttendanceError } from './presentation/attendance.error-mapper';
import {
  createAttendanceRouter,
  createMyAttendancesRouter,
} from './presentation/attendance.routes';

export interface AttendanceCrossFeaturePorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainer: LiveTrainerPort;
  readonly checkInGate: CheckInMembershipGate;
  readonly baseStarter: BaseSubscriptionStarter;
  readonly gymLocalClock: GymLocalClock;
}

export function composeAttendanceFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  ports: AttendanceCrossFeaturePorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const attendances = new SupabaseAttendanceRepository(dataClient);
  const attendanceQueries = new SupabaseAttendanceQueries(dataClient);
  const policy = new AttendanceAccessPolicy(ports.liveGymAdmin, ports.liveTrainer);

  const controller = new AttendanceController(
    new SelfCheckInUseCase(
      policy,
      attendances,
      ports.checkInGate,
      ports.baseStarter,
      ports.gymLocalClock,
      clock,
      ids,
    ),
    new DeskMarkAttendanceUseCase(
      policy,
      attendances,
      ports.checkInGate,
      ports.baseStarter,
      ports.gymLocalClock,
      clock,
      ids,
    ),
    new ListGymDayAttendancesUseCase(policy, attendanceQueries, ports.gymLocalClock, clock),
    new ListClientAttendancesUseCase(policy, attendanceQueries),
    new ListMyAttendancesUseCase(policy, attendanceQueries),
  );

  return {
    router: createAttendanceRouter(controller, authenticate),
    myAttendancesRouter: createMyAttendancesRouter(controller, authenticate),
    errorMapper: mapAttendanceError,
  };
}
