import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { ActiveMembershipConflictError } from '../application/active-membership-conflict.error';
import { DataGrantForbiddenError } from '../application/data-grant-forbidden.error';
import { InvalidInvitePlanError } from '../application/invalid-invite-plan.error';
import { InvalidMembershipInviteeError } from '../application/invalid-membership-invitee.error';
import { MembershipInviteExpiredError } from '../application/membership-invite-expired.error';
import { MembershipInviteForbiddenError } from '../application/membership-invite-forbidden.error';
import { MembershipInviteInvalidTransitionError } from '../domain/membership-invite-invalid-transition.error';

export const mapMembershipInviteError: ErrorMapper = (error) => {
  if (error instanceof InvalidMembershipInviteeError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof InvalidInvitePlanError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof MembershipInviteForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof DataGrantForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof MembershipInviteExpiredError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof ActiveMembershipConflictError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof MembershipInviteInvalidTransitionError) {
    return { status: 409, code: error.code, message: error.message };
  }
  return null;
};
