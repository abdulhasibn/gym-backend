import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { CreateGymOrgPolicy } from './application/create-gym-org.policy';
import { CreateGymOrgUseCase } from './application/create-gym-org.use-case';
import { ListMyGymOrgsUseCase } from './application/list-my-gym-orgs.use-case';
import { SupabaseGymOrgQueries } from './infrastructure/supabase-gym-org.queries';
import { SupabaseGymOrgRepository } from './infrastructure/supabase-gym-org.repository';
import { GymOrgController } from './presentation/gym-org.controller';
import { mapGymOrgError } from './presentation/gym-org.error-mapper';
import { createGymOrgRouter } from './presentation/gym-org.routes';

export function composeGymOrgFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
) {
  const gymOrgs = new SupabaseGymOrgRepository(dataClient);
  const gymOrgQueries = new SupabaseGymOrgQueries(dataClient);
  const controller = new GymOrgController(
    new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()),
    new ListMyGymOrgsUseCase(gymOrgQueries),
  );

  return {
    router: createGymOrgRouter(controller, authenticate),
    errorMapper: mapGymOrgError,
  };
}
