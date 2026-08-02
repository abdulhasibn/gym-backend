export class InvalidAccountLaneError extends Error {
  readonly code = 'ACCOUNT_LANE_INVALID';

  constructor() {
    super('Account lane must be CLIENT or STAFF');
    this.name = 'InvalidAccountLaneError';
  }
}
