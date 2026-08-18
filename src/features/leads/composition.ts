import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { ChangeLeadStatusUseCase } from './application/change-lead-status.use-case';
import { ConvertLeadUseCase } from './application/convert-lead.use-case';
import { CreateLeadUseCase } from './application/create-lead.use-case';
import { GetLeadUseCase } from './application/get-lead.use-case';
import { LeadAdminPolicy } from './application/lead-admin.policy';
import { ListDueFollowUpsUseCase } from './application/list-due-follow-ups.use-case';
import { ListLeadsUseCase } from './application/list-leads.use-case';
import { SoftDeleteLeadUseCase } from './application/soft-delete-lead.use-case';
import { UpdateLeadUseCase } from './application/update-lead.use-case';
import type { CreateMembershipInviteFromLead } from './domain/create-membership-invite.port';
import type { LiveGymAdminPort } from './domain/live-gym-admin.port';
import { SupabaseLeadQueries } from './infrastructure/supabase-lead.queries';
import { SupabaseLeadRepository } from './infrastructure/supabase-lead.repository';
import { LeadController } from './presentation/lead.controller';
import { mapLeadError } from './presentation/lead.error-mapper';
import { createLeadRouter } from './presentation/lead.routes';

export interface LeadsCrossFeaturePorts {
  readonly createMembershipInviteFromLead: CreateMembershipInviteFromLead;
}

export function composeLeadsFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  liveGymAdmin: LiveGymAdminPort,
  crossFeature: LeadsCrossFeaturePorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const leads = new SupabaseLeadRepository(dataClient);
  const leadQueries = new SupabaseLeadQueries(dataClient);
  const policy = new LeadAdminPolicy(liveGymAdmin);

  const controller = new LeadController(
    new CreateLeadUseCase(leads, policy, clock, ids),
    new ListLeadsUseCase(leadQueries, policy),
    new GetLeadUseCase(leadQueries, policy),
    new UpdateLeadUseCase(leads, policy, clock),
    new ChangeLeadStatusUseCase(leads, policy, clock),
    new ConvertLeadUseCase(leads, policy, crossFeature.createMembershipInviteFromLead, clock),
    new SoftDeleteLeadUseCase(leads, policy, clock),
    new ListDueFollowUpsUseCase(leadQueries, policy),
  );

  return {
    router: createLeadRouter(controller, authenticate),
    errorMapper: mapLeadError,
  };
}
