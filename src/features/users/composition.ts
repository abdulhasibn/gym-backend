import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { ClientSelfPolicy } from './application/client-self.policy';
import { GetMyProfileUseCase } from './application/get-my-profile.use-case';
import { GetStaffClientProfileUseCase } from './application/get-staff-client-profile.use-case';
import { ListMyProgressLogsUseCase } from './application/list-my-progress-logs.use-case';
import { ListStaffClientProgressLogsUseCase } from './application/list-staff-client-progress-logs.use-case';
import { StaffClientReadPolicy } from './application/staff-client-read.policy';
import { UpdateMyProfileUseCase } from './application/update-my-profile.use-case';
import { UpsertMyProgressLogUseCase } from './application/upsert-my-progress-log.use-case';
import type { ClientDataGrantGate } from './domain/client-data-grant.gate';
import type { LiveGymAdminPort, LiveTrainerPort } from './domain/live-staff.port';
import { SupabaseClientProfileQueries } from './infrastructure/supabase-client-profile.queries';
import { SupabaseClientProfileRepository } from './infrastructure/supabase-client-profile.repository';
import { SupabaseProgressLogQueries } from './infrastructure/supabase-progress-log.queries';
import { SupabaseProgressLogRepository } from './infrastructure/supabase-progress-log.repository';
import { UsersController } from './presentation/users.controller';
import { mapUsersError } from './presentation/users.error-mapper';
import { createMeUsersRouter, createStaffClientUsersRouter } from './presentation/users.routes';

export interface UsersStaffPorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainer: LiveTrainerPort;
  readonly dataGrantGate: ClientDataGrantGate;
}

export function composeUsersFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  staffPorts: UsersStaffPorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const profiles = new SupabaseClientProfileRepository(dataClient);
  const profileQueries = new SupabaseClientProfileQueries(dataClient);
  const progressLogs = new SupabaseProgressLogRepository(dataClient);
  const progressLogQueries = new SupabaseProgressLogQueries(dataClient);
  const selfPolicy = new ClientSelfPolicy();
  const staffPolicy = new StaffClientReadPolicy(staffPorts.liveGymAdmin, staffPorts.liveTrainer);

  const controller = new UsersController(
    new GetMyProfileUseCase(selfPolicy, profileQueries),
    new UpdateMyProfileUseCase(selfPolicy, profiles, progressLogs, clock, ids),
    new ListMyProgressLogsUseCase(selfPolicy, progressLogQueries),
    new UpsertMyProgressLogUseCase(selfPolicy, profiles, progressLogs, clock, ids),
    new GetStaffClientProfileUseCase(staffPolicy, profileQueries, staffPorts.dataGrantGate),
    new ListStaffClientProgressLogsUseCase(
      staffPolicy,
      progressLogQueries,
      staffPorts.dataGrantGate,
    ),
  );

  return {
    meRouter: createMeUsersRouter(controller, authenticate),
    staffClientRouter: createStaffClientUsersRouter(controller, authenticate),
    errorMapper: mapUsersError,
  };
}
