import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AcceptMembershipInviteUseCase } from './application/accept-membership-invite.use-case';
import { CreateMembershipInviteUseCase } from './application/create-membership-invite.use-case';
import { CreateMembershipPlanUseCase } from './application/create-membership-plan.use-case';
import { GetMembershipPlanUseCase } from './application/get-membership-plan.use-case';
import { GetMyDataGrantsUseCase } from './application/get-my-data-grants.use-case';
import { ListClientSubscriptionsUseCase } from './application/list-client-subscriptions.use-case';
import { ListMembershipInvitesUseCase } from './application/list-membership-invites.use-case';
import { ListMembershipPlansUseCase } from './application/list-membership-plans.use-case';
import { ListMyMembershipInviteInboxUseCase } from './application/list-my-membership-invite-inbox.use-case';
import { ListMySubscriptionsUseCase } from './application/list-my-subscriptions.use-case';
import { OverrideSubscriptionStartUseCase } from './application/override-subscription-start.use-case';
import { PlanAdminPolicy } from './application/plan-admin.policy';
import { RevokeMembershipInviteUseCase } from './application/revoke-membership-invite.use-case';
import { SoftDeleteMembershipPlanUseCase } from './application/soft-delete-membership-plan.use-case';
import { UpdateMembershipPlanUseCase } from './application/update-membership-plan.use-case';
import { UpdateMyDataGrantsUseCase } from './application/update-my-data-grants.use-case';
import { UpdateSubscriptionPaymentUseCase } from './application/update-subscription-payment.use-case';
import type { LiveGymAdminPort } from './domain/live-gym-admin.port';
import { SupabaseClientMembershipRepository } from './infrastructure/supabase-client-membership.repository';
import { SupabaseClientUserLookup } from './infrastructure/supabase-client-user-lookup';
import { SupabaseDataGrantQueries } from './infrastructure/supabase-data-grant.queries';
import { SupabaseDataGrantRepository } from './infrastructure/supabase-data-grant.repository';
import { SupabaseMembershipInviteQueries } from './infrastructure/supabase-membership-invite.queries';
import { SupabaseMembershipInviteRepository } from './infrastructure/supabase-membership-invite.repository';
import { SupabaseMembershipPlanQueries } from './infrastructure/supabase-membership-plan.queries';
import { SupabaseMembershipPlanRepository } from './infrastructure/supabase-membership-plan.repository';
import { SupabaseSubscriptionQueries } from './infrastructure/supabase-subscription.queries';
import { SupabaseSubscriptionRepository } from './infrastructure/supabase-subscription.repository';
import { MembershipInviteController } from './presentation/membership-invite.controller';
import {
  createMembershipInviteClientRouter,
  createMembershipInviteRouter,
  createMyDataGrantsRouter,
} from './presentation/membership-invite.routes';
import { MembershipPlanController } from './presentation/membership-plan.controller';
import { mapMembershipPlanError } from './presentation/membership-plan.error-mapper';
import { createMembershipPlanRouter } from './presentation/membership-plan.routes';
import { SubscriptionController } from './presentation/subscription.controller';
import {
  createClientSubscriptionsRouter,
  createMySubscriptionsRouter,
  createSubscriptionAdminRouter,
} from './presentation/subscription.routes';

export function composeMembershipsFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  liveGymAdmin: LiveGymAdminPort,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const plans = new SupabaseMembershipPlanRepository(dataClient);
  const planQueries = new SupabaseMembershipPlanQueries(dataClient);
  const invites = new SupabaseMembershipInviteRepository(dataClient);
  const inviteQueries = new SupabaseMembershipInviteQueries(dataClient);
  const clientUsers = new SupabaseClientUserLookup(dataClient);
  const memberships = new SupabaseClientMembershipRepository(dataClient);
  const grantQueries = new SupabaseDataGrantQueries(dataClient);
  const grants = new SupabaseDataGrantRepository(dataClient);
  const subscriptions = new SupabaseSubscriptionRepository(dataClient);
  const subscriptionQueries = new SupabaseSubscriptionQueries(dataClient);
  const policy = new PlanAdminPolicy(liveGymAdmin);

  const planController = new MembershipPlanController(
    new CreateMembershipPlanUseCase(plans, policy, clock, ids),
    new ListMembershipPlansUseCase(planQueries, policy),
    new GetMembershipPlanUseCase(planQueries, policy),
    new UpdateMembershipPlanUseCase(plans, policy, clock),
    new SoftDeleteMembershipPlanUseCase(plans, policy, clock),
  );

  const inviteController = new MembershipInviteController(
    new CreateMembershipInviteUseCase(policy, invites, plans, clientUsers, clock, ids),
    new ListMembershipInvitesUseCase(policy, inviteQueries),
    new RevokeMembershipInviteUseCase(policy, invites, clock),
    new ListMyMembershipInviteInboxUseCase(inviteQueries),
    new AcceptMembershipInviteUseCase(invites, clock),
    new GetMyDataGrantsUseCase(grantQueries),
    new UpdateMyDataGrantsUseCase(memberships, grants, clock),
  );

  const subscriptionController = new SubscriptionController(
    new ListClientSubscriptionsUseCase(policy, subscriptionQueries),
    new ListMySubscriptionsUseCase(subscriptionQueries),
    new UpdateSubscriptionPaymentUseCase(policy, subscriptions, memberships, clock),
    new OverrideSubscriptionStartUseCase(policy, subscriptions, memberships, clock),
  );

  return {
    plansRouter: createMembershipPlanRouter(planController, authenticate),
    invitesRouter: createMembershipInviteRouter(inviteController, authenticate),
    inviteClientRouter: createMembershipInviteClientRouter(inviteController, authenticate),
    myDataGrantsRouter: createMyDataGrantsRouter(inviteController, authenticate),
    clientSubscriptionsRouter: createClientSubscriptionsRouter(
      subscriptionController,
      authenticate,
    ),
    subscriptionsAdminRouter: createSubscriptionAdminRouter(subscriptionController, authenticate),
    mySubscriptionsRouter: createMySubscriptionsRouter(subscriptionController, authenticate),
    errorMapper: mapMembershipPlanError,
  };
}
