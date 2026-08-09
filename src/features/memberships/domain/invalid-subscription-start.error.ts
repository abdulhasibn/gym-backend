export class InvalidSubscriptionStartError extends Error {
  readonly code = 'INVALID_SUBSCRIPTION_START';

  constructor(message = 'Subscription start override is not allowed') {
    super(message);
    this.name = 'InvalidSubscriptionStartError';
  }
}
