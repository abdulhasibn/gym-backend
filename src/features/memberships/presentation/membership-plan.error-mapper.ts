import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { PlanForbiddenError } from '../application/plan-forbidden.error';
import { MembershipPlanDeletedError } from '../domain/membership-plan-deleted.error';
import { mapMembershipInviteError } from './membership-invite.error-mapper';
import { mapRosterError } from './roster.error-mapper';
import { mapSubscriptionError } from './subscription.error-mapper';

export const mapMembershipPlanError: ErrorMapper = (error) => {
  if (error instanceof PlanForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof MembershipPlanDeletedError) {
    return { status: 422, code: error.code, message: error.message };
  }
  const rosterMapped = mapRosterError(error);
  if (rosterMapped !== null) {
    return rosterMapped;
  }
  const subscriptionMapped = mapSubscriptionError(error);
  if (subscriptionMapped !== null) {
    return subscriptionMapped;
  }
  return mapMembershipInviteError(error);
};
