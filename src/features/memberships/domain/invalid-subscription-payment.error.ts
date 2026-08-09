export class InvalidSubscriptionPaymentError extends Error {
  readonly code = 'INVALID_SUBSCRIPTION_PAYMENT';

  constructor(message = 'Subscription payment is invalid') {
    super(message);
    this.name = 'InvalidSubscriptionPaymentError';
  }
}
