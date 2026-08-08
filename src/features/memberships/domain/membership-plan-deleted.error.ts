export class MembershipPlanDeletedError extends Error {
  readonly code = 'MEMBERSHIP_PLAN_DELETED';

  constructor(message = 'Membership plan has been deleted') {
    super(message);
    this.name = 'MembershipPlanDeletedError';
  }
}
