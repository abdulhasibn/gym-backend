export type CheckInDenialReason =
  'NO_ACTIVE_MEMBERSHIP' | 'CHECK_IN_BLOCKED' | 'NO_BASE_SUBSCRIPTION' | 'BASE_OUT_OF_DATE';

export class CheckInNotAllowedError extends Error {
  readonly code = 'CHECK_IN_NOT_ALLOWED';

  constructor(
    readonly reason: CheckInDenialReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = 'CheckInNotAllowedError';
  }
}
