import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { GymOrgCreationForbiddenError } from '../application/gym-org-creation-forbidden.error';
import { GymOrgWriteForbiddenError } from '../application/gym-org-write-forbidden.error';
import { InvalidStaffInviteeError } from '../application/invalid-staff-invitee.error';
import { StaffAlreadyAffiliatedError } from '../application/staff-already-affiliated.error';
import { StaffInviteAdminCapError } from '../application/staff-invite-admin-cap.error';
import { StaffInviteExpiredError } from '../application/staff-invite-expired.error';
import { StaffInviteForbiddenError } from '../application/staff-invite-forbidden.error';
import { StaffInviteInvalidTransitionError } from '../domain/staff-invite-invalid-transition.error';

export const mapGymOrgError: ErrorMapper = (error) => {
  if (error instanceof GymOrgCreationForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof GymOrgWriteForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof StaffInviteForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof StaffInviteExpiredError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof StaffInviteAdminCapError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof InvalidStaffInviteeError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof StaffAlreadyAffiliatedError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof StaffInviteInvalidTransitionError) {
    return { status: 409, code: error.code, message: error.message };
  }

  return null;
};
