import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { CreateMembershipPlanUseCase } from './application/create-membership-plan.use-case';
import { GetMembershipPlanUseCase } from './application/get-membership-plan.use-case';
import { ListMembershipPlansUseCase } from './application/list-membership-plans.use-case';
import { PlanAdminPolicy } from './application/plan-admin.policy';
import { SoftDeleteMembershipPlanUseCase } from './application/soft-delete-membership-plan.use-case';
import { UpdateMembershipPlanUseCase } from './application/update-membership-plan.use-case';
import type { LiveGymAdminPort } from './domain/live-gym-admin.port';
import { SupabaseMembershipPlanQueries } from './infrastructure/supabase-membership-plan.queries';
import { SupabaseMembershipPlanRepository } from './infrastructure/supabase-membership-plan.repository';
import { MembershipPlanController } from './presentation/membership-plan.controller';
import { mapMembershipPlanError } from './presentation/membership-plan.error-mapper';
import { createMembershipPlanRouter } from './presentation/membership-plan.routes';

export function composeMembershipsFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  liveGymAdmin: LiveGymAdminPort,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const plans = new SupabaseMembershipPlanRepository(dataClient);
  const planQueries = new SupabaseMembershipPlanQueries(dataClient);
  const policy = new PlanAdminPolicy(liveGymAdmin);

  const controller = new MembershipPlanController(
    new CreateMembershipPlanUseCase(plans, policy, clock, ids),
    new ListMembershipPlansUseCase(planQueries, policy),
    new GetMembershipPlanUseCase(planQueries, policy),
    new UpdateMembershipPlanUseCase(plans, policy, clock),
    new SoftDeleteMembershipPlanUseCase(plans, policy, clock),
  );

  return {
    router: createMembershipPlanRouter(controller, authenticate),
    errorMapper: mapMembershipPlanError,
  };
}
