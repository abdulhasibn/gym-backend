import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { SubscriptionForbiddenError } from '../application/subscription-forbidden.error';
import { InvalidSubscriptionPaymentError } from '../domain/invalid-subscription-payment.error';
import { InvalidSubscriptionStartError } from '../domain/invalid-subscription-start.error';

export const mapSubscriptionError: ErrorMapper = (error) => {
  if (error instanceof SubscriptionForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof InvalidSubscriptionPaymentError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof InvalidSubscriptionStartError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
