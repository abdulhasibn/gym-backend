import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { InvalidInvitePlanError } from '../application/invalid-invite-plan.error';
import { InvalidMembershipInviteeError } from '../application/invalid-membership-invitee.error';
import { MembershipInviteInvalidTransitionError } from '../domain/membership-invite-invalid-transition.error';

export const mapMembershipInviteError: ErrorMapper = (error) => {
  if (error instanceof InvalidMembershipInviteeError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof InvalidInvitePlanError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof MembershipInviteInvalidTransitionError) {
    return { status: 409, code: error.code, message: error.message };
  }
  return null;
};
