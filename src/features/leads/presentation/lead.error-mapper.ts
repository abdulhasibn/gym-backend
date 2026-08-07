import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { LeadForbiddenError } from '../application/lead-forbidden.error';
import { LeadDeletedError } from '../domain/lead-deleted.error';

export const mapLeadError: ErrorMapper = (error) => {
  if (error instanceof LeadForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof LeadDeletedError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
