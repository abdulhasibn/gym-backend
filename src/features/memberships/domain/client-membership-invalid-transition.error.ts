export class ClientMembershipInvalidTransitionError extends Error {
  readonly code = 'CLIENT_MEMBERSHIP_INVALID_TRANSITION';

  constructor(message: string) {
    super(message);
    this.name = 'ClientMembershipInvalidTransitionError';
  }
}
