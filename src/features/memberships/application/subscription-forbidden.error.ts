export class SubscriptionForbiddenError extends Error {
  readonly code = 'SUBSCRIPTION_FORBIDDEN';

  constructor(message = 'Not allowed to manage subscriptions for this gym') {
    super(message);
    this.name = 'SubscriptionForbiddenError';
  }
}
