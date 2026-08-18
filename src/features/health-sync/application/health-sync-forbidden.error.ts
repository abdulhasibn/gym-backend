export class HealthSyncForbiddenError extends Error {
  readonly code = 'HEALTH_SYNC_FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
  }
}
