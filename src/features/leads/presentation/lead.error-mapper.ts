import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { LeadEmailRequiredError } from '../application/lead-email-required.error';
import { LeadForbiddenError } from '../application/lead-forbidden.error';
import { LeadAlreadyConvertedError } from '../domain/lead-already-converted.error';
import { LeadDeletedError } from '../domain/lead-deleted.error';
import { LeadNotConvertibleError } from '../domain/lead-not-convertible.error';

export const mapLeadError: ErrorMapper = (error) => {
  if (error instanceof LeadForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof LeadDeletedError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof LeadEmailRequiredError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof LeadAlreadyConvertedError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof LeadNotConvertibleError) {
    return { status: 409, code: error.code, message: error.message };
  }
  return null;
};
